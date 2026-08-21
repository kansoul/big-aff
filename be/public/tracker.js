/* eslint-disable */
/**
 * Tracking snippet — drop in /public/tracker.js of the Next.js landing page.
 *
 * - Only activates when the landing URL carries `key=<public key>`. Without it
 *   nothing is ever sent; organic / direct traffic never calls the API.
 * - Never mints a session_id: the backend derives it from the ad params plus
 *   the caller IP and returns it; the snippet only stores that id and replays
 *   it on every later event of the visit.
 * - Captures every URL param on the first landing and replays it on each event
 *   — that replay is what lets the backend land on the same session even when
 *   the stored id is gone.
 * - Only `submit_form` carries lead fields — it is what writes the lead row —
 *   and answers the session already stored are stripped from a retry.
 * - Everything is keyed on session_id server-side: the session, the events and
 *   the lead the funnel fills in step by step.
 * - The lead closes its session: a later landing hit from the same link and IP
 *   is issued the next id in the series instead of reopening it.
 * - Exposes window.QpTracker: track / pageView / redirect / lead.
 */
(function (w, d) {
  if (w.QpTracker) return;

  // Bump when the snippet changes, and bump ?v= on the embedding <script> too.
  var VERSION = '2026-08-20.7';

  var script = d.currentScript;
  function attr(name, fallback) {
    var v = script && script.getAttribute(name);
    return v || fallback;
  }

  var API = attr('data-api', w.__QP_TRACKER_API__ || '');
  // Tracking stays off until `?key=<public key>` shows up on the landing URL.
  var KEY_PARAM = 'key';
  var PUBLIC_KEY = attr('data-key', w.__QP_PUBLIC_KEY__ || null);
  var SID_KEY = 'qp_session_id';     // id the API issued for this visit
  var CTX_KEY = 'qp_landing_ctx';
  var FP_KEY = 'qp_attr_fp';         // fingerprint of the attribution params
  var LEAD_KEY = 'qp_lead_done';     // set once the session sent its lead
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

  /**
   * The params the backend hashes into the session id. While they stay the
   * same the visitor keeps one session, no matter how often the landing page
   * is re-opened; once they change the backend derives a different session,
   * whose application row starts out empty again.
   */
  var FP_FIELDS = [
    'campaign_id', 'adset_id', 'ad_id', 'placement', 'cpid', 'lpid',
    'utm_source', 'keyword_clicked', 'gclid', 'wbraid', 'gbraid', 'ttclid',
  ];

  function fingerprint(ctx) {
    return FP_FIELDS.map(function (f) { return (ctx && ctx[f]) || ''; }).join('|');
  }

  /**
   * The id the API issued for this visit, refreshed on read so the sliding
   * window keeps it alive across reloads and client-side nav. Null until the
   * landing hit came back with one — the snippet never makes one up.
   */
  function sessionId() {
    var sid = read(SID_KEY);
    if (sid) store(SID_KEY, sid, TTL_MIN);
    return sid || null;
  }

  /**
   * Attribution changed → the backend will hash a different session id, so the
   * answers the previous one had already stored no longer apply and have to
   * travel again.
   */
  function syncAttribution() {
    var fp = fingerprint(context());

    if (read(FP_KEY) !== fp) {
      forget(SID_KEY);
      forget(SENT_KEY);
    }

    store(FP_KEY, fp, TTL_MIN);
  }

  /**
   * A landing hit after the visit sent its lead starts a new visit: drop the
   * closed session so the payload goes up without an id. The backend then
   * walks past the closed one and issues the next id for these very same
   * params and IP.
   */
  function startVisit() {
    if (read(LEAD_KEY) !== '1') return;

    forget(SID_KEY);
    forget(SENT_KEY);
    forget(LEAD_KEY);
  }

  /**
   * Landing params, captured once and kept for the session. Every field here is
   * one the backend stores — `event_views` / `event_clicks` take the ad params,
   * `ads_conversions` the click ids — plus `key`, which gates the endpoint.
   * Anything the API does not keep has no business travelling on every event.
   */
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
    // Stored as `traffic` on the event row.
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

  /** The event that converts the visit and closes its session. */
  var LEAD_TYPE = 'submit_form';

  /** Events whose fields land on the session's lead. */
  var APPLICATION_TYPES = [LEAD_TYPE];

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

  /** Only called once the backend stored the event, so a failed send is retried. */
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
        // The id the API issued; every later event of the visit replays it.
        // Never revive a session the lead already closed.
        if (data.session_id && read(LEAD_KEY) !== '1') store(SID_KEY, data.session_id, TTL_MIN);
        return data;
      })
      .catch(function () { return null; });
  }

  var QpTracker = {
    version: VERSION,
    /** The API-issued id of this visit, or null before the landing hit. */
    sessionId: sessionId,
    /** Landing params captured on the first hit, replayed on every event. */
    context: context,

    /** True once the activation param has been seen in this session. */
    isActive: isActive,

    /**
     * track('page_view' | 'redirect' | 'submit_form', extraFields)
     * redirect / submit_form may carry lead fields; the backend stores them on
     * the lead of this session_id.
     */

    track: function (type, data, opts) {
      if (!isActive()) return Promise.resolve(null);

      syncAttribution();
      if (type === 'page_view') startVisit();

      var isApplication = APPLICATION_TYPES.indexOf(type) >= 0;
      // Callers pass the whole step patch; only what this session has not
      // stored yet goes on the wire.
      var fields = isApplication ? newFields(data) : data || {};
      var hasFields = Object.keys(fields).length > 0;

      var ctx = context();
      var payload = {};

      // Every event replays the landing params: they are what the backend
      // hashes the session id from when the payload carries none.
      Object.keys(ctx).forEach(function (k) { if (ctx[k] != null) payload[k] = ctx[k]; });

      payload.type = type;
      // Only ever the id the API handed back; when there is none yet the
      // backend derives it from the params above and returns it.
      var sid = sessionId();
      if (sid) payload.session_id = sid;
      payload.page = 'quickpayly';
      payload.event_time = new Date().toISOString().slice(0, 19).replace('T', ' ');

      Object.assign(payload, fields);

      // The lead is the last event of the visit, so close the session right
      // here — synchronously, because the final confirmation usually navigates
      // away before any response comes back.
      if (type === LEAD_TYPE) store(LEAD_KEY, '1', TTL_MIN);

      return send(payload, opts && opts.beacon).then(function (res) {
        // success:false means the backend refused the payload — those fields
        // have to travel again on the next attempt.
        if (res && res.success !== false && isApplication && hasFields) rememberFields(fields);
        return res;
      });
    },

    pageView: function (fields) { return QpTracker.track('page_view', fields); },
    /**
     * The lead of this visit: pass the whole lead (email, name, phone,
     * address…) — this is the only event whose fields are stored. It closes
     * the session, so the next landing hit is issued a new one.
     */
    lead: function (fields) { return QpTracker.track(LEAD_TYPE, fields); },
    /** Leaving the landing page. Logs the click only; it stores no fields. */
    redirect: function (opts) {
      // fetch keepalive survives the unload too, and stays visible in DevTools.
      return QpTracker.track('redirect', null, opts);
    },

    /**
     * Leaving the landing page: log the redirect, then navigate once it is
     * saved. The answers collected here travel later, with the lead.
     *
     *   QpTracker.advance('/apply')
     *
     * @param {string} [url]  where to go afterwards
     */
    advance: function (url) {
      return QpTracker.redirect().then(function (res) {
        if (url) w.location.assign(url);
        return res;
      });
    },
  };

  w.QpTracker = QpTracker;

  // First hit of an activated session → page_view (opens the session and the
  // revenue row server-side). Without the activation param nothing is sent.
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', function () { QpTracker.track('page_view'); });
  } else {
    QpTracker.track('page_view');
  }
})(window, document);
