/* eslint-disable */
/**
 * Tracking snippet — drop in /public/tracker.js of the Next.js landing page.
 *
 * - Only activates when the landing URL carries `key=<public key>`. Without it
 *   nothing is ever sent; organic / direct traffic never calls the API.
 * - Creates one session_id per visit (survives F5 / client-side nav); it only
 *   rotates when the landing params change or after the visit sent its `lead`.
 * - Captures every URL param on the first landing and replays it on each event.
 * - Sends each answer once per session: fields the session already stored are
 *   stripped from later payloads, and next_step carries no ad params at all.
 * - Everything is keyed on session_id: the session, the events and the loan
 *   application the funnel fills in step by step.
 * - Exposes window.QpTracker: track / pageView / redirect / nextStep / lead.
 */
(function (w, d) {
  if (w.QpTracker) return;

  // Bump when the snippet changes, and bump ?v= on the embedding <script> too.
  var VERSION = '2026-08-19.4';

  var script = d.currentScript;
  function attr(name, fallback) {
    var v = script && script.getAttribute(name);
    return v || fallback;
  }

  var API = attr('data-api', w.__QP_TRACKER_API__ || '');
  // Tracking stays off until `?key=<public key>` shows up on the landing URL.
  var KEY_PARAM = 'key';
  var PUBLIC_KEY = attr('data-key', w.__QP_PUBLIC_KEY__ || null);
  var SID_KEY = 'qp_session_id';
  var CTX_KEY = 'qp_landing_ctx';
  var FP_KEY = 'qp_attr_fp';         // fingerprint of the attribution params
  var LEAD_KEY = 'qp_lead_done';     // set once the session produced a lead
  var SENT_KEY = 'qp_sent_fields';   // answers already stored for this session
  var TTL_MIN = 60 * 24;             // sliding session window, in minutes (same as Voluum: 24h)

  // ── storage helpers: cookie first (survives tab close), localStorage as fallback
  function setCookie(name, value, minutes) {
    var exp = new Date(Date.now() + minutes * 60000).toUTCString();
    var secure = w.location.protocol === 'https:' ? '; Secure' : '';
    d.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax' + secure;
  }
  function getCookie(name) {
    var m = d.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }
  function store(key, value, minutes) {
    setCookie(key, value, minutes);
    try {
      localStorage.setItem(key, value);
      localStorage.setItem(key + '_exp', String(Date.now() + minutes * 60000));
    } catch (e) {}
  }
  function read(key) {
    var v = getCookie(key);
    if (v) return v;
    try {
      var exp = Number(localStorage.getItem(key + '_exp') || 0);
      if (exp > Date.now()) return localStorage.getItem(key);
    } catch (e) {}
    return null;
  }

  function forget(key) {
    store(key, '', 0);
    try { localStorage.removeItem(key); localStorage.removeItem(key + '_exp'); } catch (e) {}
  }

  function uuid() {
    if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Attribution params identify the visit; while they stay the same the
   * visitor keeps one session, no matter how often the landing page is
   * re-opened.
   */
  var FP_FIELDS = [
    'campaign_id', 'adset_id', 'ad_id', 'placement', 'cpid', 'lpid',
    'utm_source', 'keyword_clicked', 'gclid', 'wbraid', 'gbraid', 'ttclid',
  ];

  function fingerprint(ctx) {
    return FP_FIELDS.map(function (f) { return (ctx && ctx[f]) || ''; }).join('|');
  }

  /**
   * Session: reused on reload and on client-side nav (sliding window). A new
   * one is only minted when the attribution params changed, or when the
   * previous session was closed by its `lead` — so re-opening the very same
   * link after converting starts a fresh session.
   */
  function sessionId() {
    var fp = fingerprint(context());
    var sid = read(SID_KEY);

    if (sid && (read(FP_KEY) !== fp || read(LEAD_KEY) === '1')) sid = null;

    if (!sid) {
      sid = uuid();
      forget(LEAD_KEY);
      forget(SENT_KEY);
    }

    store(SID_KEY, sid, TTL_MIN);
    store(FP_KEY, fp, TTL_MIN);
    return sid;
  }

  // ── landing context: all URL params, captured once and kept for the session
  var PARAM_MAP = {
    campaign_id: ['campaign_id', 'campaignid', 'gad_campaignid', 'utm_campaign'],
    adset_id: ['adset_id', 'ad_set_id', 'adsetid', 'utm_adset'],
    ad_id: ['ad_id', 'creative_id', 'adid', 'utm_content'],
    utm_source: ['utm_source', 'source'],
    gclid: ['gclid'],
    wbraid: ['wbraid'],
    gbraid: ['gbraid'],
    ttclid: ['ttclid'],
    keyword_clicked: ['keyword', 'kw', 'utm_term'],
    // Ad network placement and the tracker (Voluum) click / landing page ids.
    placement: ['placement'],
    cpid: ['cpid'],
    lpid: ['lpid'],
    test: ['test', 'traffic'],
    key: [KEY_PARAM],
  };

  /**
   * Ad networks fill macros in at click time; anything still in `__MACRO__`
   * shape never got substituted and must not be stored as a real value.
   */
  function clean(value) {
    if (!value) return null;
    return /^__.*__$/.test(value) || value === 'null' || value === 'undefined' ? null : value;
  }

  function context() {
    var saved = {};
    try { saved = JSON.parse(read(CTX_KEY) || '{}'); } catch (e) {}

    var qs = new URLSearchParams(w.location.search);
    var ctx = { query: w.location.search.replace(/^\?/, '') || saved.query || null };

    Object.keys(PARAM_MAP).forEach(function (field) {
      var value = null;
      PARAM_MAP[field].some(function (name) {
        var v = clean(qs.get(name));
        if (v) { value = v; return true; }
        return false;
      });
      // URL wins, otherwise keep what the landing hit captured.
      ctx[field] = value || saved[field] || null;
    });

    store(CTX_KEY, JSON.stringify(ctx), TTL_MIN);
    return ctx;
  }

  /** Events whose fields land on the session's loan application. */
  var APPLICATION_TYPES = ['redirect', 'next_step', 'lead'];

  function sentFields() {
    try { return JSON.parse(read(SENT_KEY) || '{}'); } catch (e) { return {}; }
  }

  /**
   * The application row is keyed on session_id, so an answer only has to travel
   * once: keep the fields whose value the session has not stored yet. Values are
   * compared as strings because the ledger goes through JSON.
   */
  function newFields(fields) {
    var stored = sentFields();
    var fresh = {};

    Object.keys(fields || {}).forEach(function (k) {
      if (fields[k] == null) return;
      if (!(k in stored) || String(stored[k]) !== String(fields[k])) fresh[k] = fields[k];
    });

    return fresh;
  }

  /** Only called once the backend confirmed the event, so a failed send is retried. */
  function rememberFields(fields) {
    var stored = sentFields();
    Object.keys(fields).forEach(function (k) { stored[k] = fields[k]; });
    store(SENT_KEY, JSON.stringify(stored), TTL_MIN);
  }

  /**
   * Activated once `key` arrived on the landing URL; the value is kept in the
   * session context, so later steps still track after the URL is cleaned. When
   * the snippet declares data-key, the param has to match it exactly.
   */
  function isActive() {
    var value = context()[KEY_PARAM];
    if (!value) return false;
    return PUBLIC_KEY === null || String(value) === PUBLIC_KEY;
  }

  function send(payload, useBeacon) {
    var body = JSON.stringify(payload);
    var url = API + '/api/tracking/log';

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      return Promise.resolve(null);
    }

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body,
      keepalive: true,
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var data = (res && res.data) || res || {};
        // Never revive a session the `lead` already closed.
        if (data.session_id && read(LEAD_KEY) !== '1') store(SID_KEY, data.session_id, TTL_MIN);
        return data;
      })
      .catch(function () { return null; });
  }

  var QpTracker = {
    version: VERSION,
    sessionId: sessionId,
    /** Landing params captured on the first hit, replayed on every event. */
    context: context,

    /** True once the activation param has been seen in this session. */
    isActive: isActive,

    /**
     * track('page_view' | 'redirect' | 'next_step' | 'lead', extraFields)
     * redirect / next_step / lead may carry loan application fields; the
     * backend stores them on the application of this session_id.
     */

    track: function (type, data, opts) {
      if (!isActive()) return Promise.resolve(null);

      var isApplication = APPLICATION_TYPES.indexOf(type) >= 0;
      // Callers pass the whole step patch; only what this session has not
      // stored yet goes on the wire.
      var fields = isApplication ? newFields(data) : data || {};
      var hasFields = Object.keys(fields).length > 0;

      // next_step exists only to store answers, so one without any is dropped.
      if (type === 'next_step' && !hasFields) return Promise.resolve(null);

      var ctx = context();
      var payload = {};

      // next_step writes no event row, so it needs no ad params: the session id
      // already points at the application row they were stored on. Only the
      // activation key travels, because the backend re-checks it on every event.
      if (type === 'next_step') payload.key = ctx.key;
      else Object.keys(ctx).forEach(function (k) { if (ctx[k] != null) payload[k] = ctx[k]; });

      payload.type = type;
      payload.session_id = sessionId();
      payload.page = 'quickpayly';
      payload.event_time = new Date().toISOString().slice(0, 19).replace('T', ' ');

      Object.assign(payload, fields);

      // The lead is the last event of the visit, so close the session right
      // here — synchronously, because the final confirmation usually navigates
      // away before any response comes back.
      if (type === 'lead') store(LEAD_KEY, '1', TTL_MIN);

      return send(payload, opts && opts.beacon).then(function (res) {
        if (res && isApplication && hasFields) rememberFields(fields);
        return res;
      });
    },

    pageView: function (fields) { return QpTracker.track('page_view', fields); },
    nextStep: function (fields) { return QpTracker.track('next_step', fields); },
    /** Converts and closes the session; the next hit starts a new one. */
    lead: function (fields) { return QpTracker.track('lead', fields); },
    redirect: function (fields, opts) {
      // fetch keepalive survives the unload too, and stays visible in DevTools.
      return QpTracker.track('redirect', fields, opts);
    },

    /**
     * Submitting the landing form: log the redirect together with whatever the
     * page collected (email, loan amount) — the backend stores those on the
     * session's loan application — and only navigate once it is saved.
     *
     *   QpTracker.advance({ loan_amount: 3, email: 'a@b.com' }, '/apply')
     *
     * @param {Object} [fields]  answers collected on this page, backend names
     * @param {string} [url]     where to go afterwards
     */
    advance: function (fields, url) {
      return QpTracker.redirect(fields).then(function (res) {
        if (url) w.location.assign(url);
        return res;
      });
    },
  };

  w.QpTracker = QpTracker;

  // First hit of an activated session → page_view (also opens the revenue row
  // server-side). Without the activation param nothing is ever sent.
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () { QpTracker.track('page_view'); });
  } else {
    QpTracker.track('page_view');
  }
})(window, document);
