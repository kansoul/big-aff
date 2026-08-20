# Nhúng tracking vào Landing Page (Next.js)

Script: [`be/public/tracker.js`](../../be/public/tracker.js) — expose `window.QpTracker`.

Endpoint: `POST {API}/api/tracking/log`, 3 event type: `page_view`, `redirect`, `submit_form`.

**Cổng kích hoạt — param `key`:** tracker chỉ gọi API khi URL vào trang có `?key=<PUBLIC_KEY>`.

- Client: snippet khai báo khoá mong đợi qua `data-key`; param phải khớp đúng. Không khớp (hoặc thiếu) thì mọi hàm `QpTracker.*` trả `null` và **không** phát request nào — kiểm tra bằng `QpTracker.isActive()`.
- Server: `key` được gửi kèm mọi event và BE đối chiếu với `config('whitelist.tracking_key')` (env `TRACKING_PUBLIC_KEY`). Sai khoá → `success: false`. Để env rỗng thì BE không bắt buộc `key` (tương thích landing page cũ).
- Khoá được lưu trong `qp_landing_ctx` nên các bước sau của phễu (URL đã sạch param) vẫn tracking bình thường.

URL quảng cáo vì vậy có dạng: `https://lp.example.com/?key=PUBLIC_KEY_123&campaign_id=123&gclid=...`

## 1. Session do backend cấp

Snippet **không tự sinh `session_id`**. Lần vào trang đầu tiên nó gửi `page_view` **không kèm** `session_id`; backend suy ra id, trả về trong response và snippet lưu lại (`qp_session_id`) để replay cho mọi event sau.

`session_id` không random mà là UUIDv5 băm từ chính dữ liệu của cú click ([`StoreTrackingLogAction`](../../be/app/Actions/Tracking/StoreTrackingLogAction.php)):

```
uuid5(NAMESPACE_URL, "campaign_id|adset_id|ad_id|ip_address|<lần thứ n>")
```

Backend xử lý theo thứ tự:

1. Payload có `session_id` và id đó đã tồn tại → dùng lại.
2. Không có → băm id ở lần 0. Chưa có row → tạo session mới. Có row và **chưa chốt** → dùng lại.
3. Row đó **đã chốt** (đã có dòng trong `leads`) → nhảy sang lần 1, lần 2… cho tới khi gặp id còn trống hoặc chưa chốt (tối đa 50 lần, vượt ngưỡng thì cấp UUID ngẫu nhiên).
4. Payload không có cả param quảng cáo lẫn IP → cấp UUID ngẫu nhiên (không gộp mọi khách vào chung một session).

Hệ quả: cùng một link + cùng IP, xoá sạch cookie/localStorage rồi vào lại vẫn ra **đúng session cũ**; nhưng sau khi đã gửi `submit_form` thì lần vào trang tiếp theo được cấp **session mới**.

## 2. Event nào ghi gì

| Event | Ghi vào DB | Redis (`realtime_reports`) |
|---|---|---|
| `page_view` | `tracking_sessions` (nếu là session mới), `event_views`, `revenue_reports` (1 dòng/session, khi có `campaign_id`), `ads_conversions` (khi có `gclid`/`wbraid`/`gbraid`/`ttclid`) | `view_count` |
| `redirect` | `event_clicks` | `redirect_count` |
| `submit_form` | `event_clicks` + `leads` (updateOrCreate theo `session_id`) → **chốt session** | `submit_form_count` |

**Chỉ `submit_form` mới lưu field.** `page_view` / `redirect` chỉ ghi event row với các param quảng cáo; mọi field khác gửi kèm chúng đều bị validation loại.

## 3. Nhúng script vào Next.js

**App Router** — `app/layout.tsx`:

```tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          // ?v= phải bump cùng VERSION trong tracker.js để bust cache trình duyệt
          src="https://api.your-domain.com/tracker.js?v=2026-08-20.7"
          strategy="afterInteractive"
          data-api={process.env.NEXT_PUBLIC_TRACKING_API}
          data-key={process.env.NEXT_PUBLIC_TRACKING_KEY}
        />
      </body>
    </html>
  )
}
```

**Pages Router**: đặt `<Script>` tương tự trong `pages/_app.tsx`.

Script tự bắn `page_view` một lần khi load. Nếu LP là SPA nhiều "trang ảo" và muốn bắn lại mỗi lần đổi route:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function usePageView() {
  const pathname = usePathname()
  useEffect(() => { window.QpTracker?.track('page_view') }, [pathname])
}
```

> Lưu ý: `page_view` sau khi session đã chốt sẽ **mở session mới**. Đừng bắn nó ở trang cảm ơn / trang offer sau bước submit, nếu không mỗi lượt convert sẽ bị đếm thêm một visit.

## 4. Gọi API theo từng event

**Rời landing page** — `advance()` bắn `redirect` rồi mới điều hướng:

```ts
// Submit form ở landing, hoặc nút CTA: chỉ log redirect
await window.QpTracker.advance('/apply')   // bỏ tham số nếu tự điều hướng (router.push)
await window.QpTracker.advance()

// Redirect sang trang offer — beacon để không mất event khi trang unload
window.QpTracker.redirect({ beacon: true })
window.location.href = offerUrl
```

Email / loan amount thu ở landing **không gửi ở bước này** — chúng đi cùng lead ở cuối phễu.

**Bước xác nhận cuối** — `lead()` gửi trọn bộ lead, ghi `leads` và chốt session:

```ts
await window.QpTracker.lead({
  website_url: window.location.origin,
  email: values.email,
  first_name: values.firstName,
  last_name: values.lastName,
  date_of_birth: values.dob,        // bắt buộc YYYY-MM-DD
  cell_phone: values.phone,
  address: values.street,
  city: location.city,
  state: location.state,
  zip: values.zip,
})
```

Đúng 10 cột trên là toàn bộ những gì `leads` lưu (xem `StoreLeadRequest::fieldRules()`); field lạ bị validation bỏ qua.

API của script:

| Hàm | Ý nghĩa |
|---|---|
| `QpTracker.track(type, fields?, opts?)` | Bắn event bất kỳ; `opts.beacon = true` để dùng `sendBeacon` |
| `QpTracker.pageView(fields?)` | `type = page_view`; mở session mới nếu session trước đã chốt |
| `QpTracker.redirect(opts?)` | `type = redirect`; chỉ log click, không mang field |
| `QpTracker.lead(fields)` | `type = submit_form`; ghi `leads` và chốt session |
| `QpTracker.advance(url?)` | `redirect` → điều hướng tới `url` |
| `QpTracker.isActive()` | Đã kích hoạt chưa (`key` hợp lệ đã xuất hiện trong session) |
| `QpTracker.sessionId()` | Id API đã cấp cho lượt truy cập này (`null` trước khi `page_view` trả về) |
| `QpTracker.context()` | Các param bắt được ở lần vào trang đầu |

Khoá lưu trữ (đặt riêng để chạy song song với hệ thống tracking cũ):

| Khoá | Nội dung | TTL |
|---|---|---|
| `qp_session_id` | `session_id` API trả về, cookie + localStorage | 24 giờ trượt |
| `qp_landing_ctx` | Toàn bộ param bắt được ở lần vào trang đầu | 24 giờ trượt |
| `qp_attr_fp` | Vân tay của các param attribution; đổi thì bỏ id cũ để xin id mới | 24 giờ trượt |
| `qp_lead_done` | Đánh dấu session đã gửi lead | 24 giờ trượt |
| `qp_sent_fields` | Các field đã lưu cho session này, để không gửi lại | 24 giờ trượt |

## Mọi event đều replay param quảng cáo

Payload của cả 3 event đều mang lại toàn bộ `qp_landing_ctx` (`campaign_id`, `adset_id`, `ad_id`, `utm_source`, `placement`, `cpid`, `lpid`, `gclid`…). Hai lý do:

- `event_views` / `event_clicks` lưu chúng, và Redis đếm `view_count` / `redirect_count` / `submit_form_count` theo `campaign_id` — thiếu `campaign_id` thì event vẫn lưu nhưng không vào báo cáo ngày;
- nếu cookie/localStorage bị xoá giữa phễu, payload không còn `session_id` thì backend vẫn băm lại đúng session từ các param này + IP.

## Chỉ gửi field mới

`leads` định danh bằng `session_id`, nên mỗi answer chỉ cần đi qua dây một lần. Snippet giữ sổ `qp_sent_fields` và lọc payload của `submit_form`:

- field có giá trị **y như lần trước** → bị loại khỏi payload;
- user sửa lại một answer → giá trị mới khác sổ nên được gửi lại;
- sổ chỉ ghi khi response **không phải** `success: false`, nên lead bị lỗi mạng hoặc trượt validation vẫn gửi lại đủ field ở lần thử sau;
- đổi param quảng cáo (session khác) → xoá sổ, mọi field gửi lại từ đầu.

## Vòng đời session

`session_id` được cấp lại (id mới) khi:

- **session trước đã gửi lead** và sau đó có thêm một `page_view` — `qp_lead_done` được ghi **ngay lúc gửi event**, không chờ response, nên trang confirm điều hướng đi luôn cũng không mất; `page_view` kế tiếp bỏ id cũ, backend thấy id lần n đã chốt nên cấp id lần n+1;
- **param attribution đổi** (`campaign_id`, `adset_id`, `ad_id`, `placement`, `cpid`, `lpid`, `utm_source`, `keyword`, `gclid`/`wbraid`/`gbraid`/`ttclid`) — so bằng `qp_attr_fp`;
- **IP đổi** (đổi 4G ↔ WiFi) mà máy không còn `qp_session_id` — vì IP nằm trong chuỗi băm.

Ngược lại, cùng link + cùng IP thì mở đi mở lại vẫn là **một session**, kể cả khi đã xoá cookie — đó là điểm khác so với bản cũ (session_id sinh ngẫu nhiên phía client). Đổi lại, hai người dùng chung IP (NAT công ty, cùng gia đình) vào cùng một link sẽ dùng chung một session cho tới khi một trong hai gửi lead.

## Kiểm tra

1. Vào LP kèm query đầy đủ: `?key=PUBLIC_KEY_123&campaign_id=123&gclid=abc&utm_source=google`. (Thiếu `key` thì không có request nào — đó là hành vi đúng.)
2. DevTools → Network: có `POST /api/tracking/log` với `type=page_view`, payload **không có** `session_id`, response `{ success: true, session_id }`.
3. F5 vài lần → payload lần sau có `session_id`, giá trị **không đổi**; `tracking_sessions` / `revenue_reports` vẫn 1 dòng, `event_views` thêm dòng mỗi lần load.
4. Xoá cookie + localStorage rồi vào lại đúng URL → `session_id` trả về vẫn **y như cũ** (băm lại từ param + IP).
5. `ads_conversions` có dòng chứa `gclid` (type `google`, hoặc `tiktok` nếu có `ttclid`).
6. Gọi `lead({...})` → `leads` có dòng theo `session_id`, `event_clicks` có dòng `submit_form`.
7. Load lại landing page sau bước 6 → `session_id` **mới**, `tracking_sessions` và `revenue_reports` có thêm 1 dòng.

## Lưu ý

- **Env cần đặt:** BE `TRACKING_PUBLIC_KEY=...`, LP `NEXT_PUBLIC_TRACKING_KEY=...` — hai giá trị phải giống nhau.
- **`campaign_id` chỉ bắt buộc với `page_view`** (xem `StoreTrackingLogRequest`), vì đó là event mở `revenue_reports` (cột `campaign_id` NOT NULL). Các event sau chạy ở màn form nên để optional, tránh mất lead.
- `submit_form` dùng bộ rule `StoreLeadRequest::fieldRules()` — sai định dạng một field (hay gặp nhất: `date_of_birth` không phải `Y-m-d`) là **cả event bị bỏ**, response `success: false`, session cũng không được chốt.
- Response luôn HTTP 200; kiểm `success` chứ đừng kiểm status code.
- Endpoint nằm sau middleware `check.whitelist`: domain LP phải có trong `config/whitelist.php` (hoặc tắt `whitelist.enabled`), và phải nằm trong `FRONTEND_URL` để qua CORS.
- Script dùng cookie first-party trên chính domain LP nên không vướng chặn third-party cookie, kể cả khi API khác domain.
