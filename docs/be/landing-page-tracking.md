# Nhúng tracking vào Landing Page (Next.js)

Script: [`be/public/tracker.js`](../../be/public/tracker.js) — expose `window.QpTracker`.

Endpoint: `POST {API}/api/tracking/log`, 4 event type: `page_view`, `redirect`, `next_step`, `lead`.

**Cổng kích hoạt — param `key`:** tracker chỉ gọi API khi URL vào trang có `?key=<PUBLIC_KEY>`.

- Client: snippet khai báo khoá mong đợi qua `data-key`; param phải khớp đúng. Không khớp (hoặc thiếu) thì mọi hàm `QpTracker.*` trả `null` và **không** phát request nào — kiểm tra bằng `QpTracker.isActive()`.
- Server: `key` được gửi kèm mọi event và BE đối chiếu với `config('whitelist.tracking_key')` (env `TRACKING_PUBLIC_KEY`). Sai khoá → `success: false`. Để env rỗng thì BE không bắt buộc `key` (tương thích landing page cũ).
- Khoá được lưu trong `qp_landing_ctx` nên các bước sau của phễu (URL đã sạch param) vẫn tracking bình thường.

URL quảng cáo vì vậy có dạng: `https://lp.example.com/?key=PUBLIC_KEY_123&campaign_id=123&gclid=...`

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
          src="https://api.your-domain.com/tracker.js"                             
          strategy="afterInteractive"
          data-api={process.env.NEXT_PUBLIC_TRACKING_API}
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

## 4. Gọi API theo từng event

**Submit form ở landing page (email + loan amount)** — dùng `advance()`, nó bắn `redirect` kèm dữ liệu rồi mới điều hướng:

```ts
// Form ở landing thu được loan amount + email
await window.QpTracker.advance(
  { loan_amount: 3, email: values.email, utm_source: utmSource },
  "/apply",                       // bỏ tham số này nếu tự điều hướng (router.push)
)

// Nút CTA không có form: chỉ log redirect
await window.QpTracker.advance()
```

`redirect` vừa ghi `event_clicks`, vừa lưu `email` / `loan_amount` vào `loan_applications` — backend tham chiếu theo `session_id`: chưa có thì tạo, có rồi thì update đúng dòng đó.

```ts
// Bấm nút sang bước tiếp theo của form
await window.QpTracker.nextStep({
  loan_amount: 2,
  email: values.email,
  phone: values.phone,
})
// Truyền cả patch của step cũng được: snippet tự lọc, chỉ gửi field chưa lưu

// Bước confirm cuối cùng: đóng application và ghi event lead
await window.QpTracker.lead({ ssn: values.ssn })

// Redirect sang trang offer — dùng sendBeacon nên không mất event khi trang unload
window.QpTracker.redirect({ keyword_clicked: keyword })
window.location.href = offerUrl
```

API của script:

| Hàm | Ý nghĩa |
|---|---|
| `QpTracker.track(type, data?, opts?)` | Bắn event bất kỳ; `opts.beacon = true` để dùng `sendBeacon` |
| `QpTracker.nextStep(fields)` | `type = next_step`, update từng phần loan application theo `session_id`; không có field mới thì không gửi request |
| `QpTracker.lead(fields?)` | `type = lead`; lưu nốt field cuối, đóng application (`completed_at`) và kết thúc session |
| `QpTracker.redirect(fields?)` | `type = redirect`; `fields` (email, loan amount) cũng vào loan application |
| `QpTracker.advance(fields?, url?)` | `redirect` kèm `fields` → điều hướng tới `url` |
| `QpTracker.isActive()` | Đã kích hoạt chưa (`key` hợp lệ đã xuất hiện trong session) |
| `QpTracker.sessionId()` | Session hiện tại |

Khoá lưu trữ (đặt riêng để chạy song song với hệ thống tracking cũ):

| Khoá | Nội dung | TTL |
|---|---|---|
| `qp_session_id` | session_id (UUID), cookie + localStorage | 24 giờ trượt |
| `qp_landing_ctx` | Toàn bộ param bắt được ở lần vào trang đầu | 24 giờ trượt |
| `qp_attr_fp` | Vân tay của các param attribution, đổi thì mới sinh session mới | 24 giờ trượt |
| `qp_lead_done` | Đánh dấu session đã có `lead` | 24 giờ trượt |
| `qp_sent_fields` | Các answer đã lưu cho session này, để không gửi lại | 24 giờ trượt |

## Chỉ gửi field mới

Application row định danh bằng `session_id`, nên mỗi answer chỉ cần đi qua dây một lần. Snippet giữ sổ `qp_sent_fields` và tự lọc payload của `redirect` / `next_step` / `lead`:

- field có giá trị **y như lần trước** → bị loại khỏi payload;
- `next_step` mà không còn field nào mới → **không gửi request** (resolve `null`);
- user sửa lại một answer → giá trị mới khác sổ nên được gửi lại;
- sổ chỉ ghi **sau khi backend trả về thành công**, nên event lỗi mạng được gửi lại ở event kế tiếp thay vì mất dữ liệu;
- session mới (đổi param hoặc sau `lead`) thì xoá sổ, mọi answer gửi lại từ đầu.

Nhờ vậy caller cứ truyền cả patch của step (`buildStepPatch`) mà không phải tự nhớ đã gửi gì.

### Payload của `next_step` chỉ còn session_id

`next_step` không ghi event row nào, nên nó **không mang các param quảng cáo** — payload chỉ gồm `key`, `session_id`, `type`, `page`, `event_time` và các answer mới. Nếu row được mở bởi chính `next_step` (ví dụ CTA không có form nên `redirect` đi rỗng), backend lấy `campaign_id` / `adset_id` / `ad_id` / `utm_source` từ `event_views` của cùng session (`StoreTrackingLogAction::sessionAttribution`).

Ngược lại **`page_view` / `redirect` / `lead` vẫn phải replay đủ param**, vì chúng ghi `event_views` / `event_clicks` và đếm `view_count` / `redirect_count` / `lead_count` theo `campaign_id` trong Redis — thiếu `campaign_id` là event vẫn lưu nhưng không được tính vào báo cáo ngày.

## 5. Kiểm tra

1. Vào LP kèm query đầy đủ: `?key=PUBLIC_KEY_123&campaign_id=123&gclid=abc&utm_source=google`. (Thiếu `key` thì không có request nào — đó là hành vi đúng.)
2. DevTools → Network: có `POST /api/tracking/log` với `type=page_view`, response `{ success: true, session_id }`.
3. F5 vài lần, hoặc mở lại đúng URL đó → `session_id` **không đổi**, `revenue_reports` / `ads_conversions` chỉ ghi ở lần tạo session đầu tiên.
4. DB: `event_views` có dòng page_view; `ads_conversions` có dòng chứa `gclid` (type `google`, hoặc `tiktok` nếu có `ttclid`).
5. Gọi `redirect` kèm `email` + `loan_amount` → `loan_applications` có dòng mới; `next_step` kế tiếp trong cùng session update đúng dòng đó (payload chỉ chứa field mới); `lead` set `completed_at`.
6. Sau `lead`, load lại landing page → `session_id` mới, và `revenue_reports` có thêm 1 dòng.

## Vòng đời session

Session do `tracker.js` quyết định, backend chỉ nhận `session_id` được gửi lên. Một `session_id` mới chỉ sinh ra khi:

- các param attribution đổi (`campaign_id`, `adset_id`/`ad_set_id`, `ad_id`/`creative_id`, `placement`, `cpid`, `lpid`, `utm_source`, `keyword`, `gclid`/`wbraid`/`gbraid`/`ttclid`) — so bằng khoá `qp_attr_fp`; hoặc
- session trước đó đã bắn `lead` — khoá `qp_lead_done` được ghi **ngay lúc gửi event**, không chờ response, nên trang confirm điều hướng đi luôn cũng không mất; hoặc
- hết cửa sổ trượt **24 giờ** (`TTL_MIN` trong `tracker.js`, cùng cửa sổ 24h Voluum dùng cho cookie `vl-<cpid>`) — mỗi event đều gia hạn lại cookie.

Nên cùng một máy mở đi mở lại đúng URL với đúng bộ param thì vẫn là một session, và chỉ sau `lead` mới bắt đầu session mới. Đổi lại, xoá cookie/localStorage hoặc mở trình duyệt khác vẫn tính là session mới.

## Lưu ý

- **Env cần đặt:** BE `TRACKING_PUBLIC_KEY=...`, LP `NEXT_PUBLIC_TRACKING_KEY=...` — hai giá trị phải giống nhau.
- **`campaign_id` chỉ bắt buộc với `page_view`** (xem `StoreTrackingLogRequest`), vì đó là event mở `revenue_reports` (cột `campaign_id` NOT NULL). Các event sau chạy ở màn form nên để optional, tránh mất `lead`.
- `redirect` / `next_step` / `lead` dùng chung bộ rule của `UpdateLoanApplicationRequest::fieldRules()` — sai định dạng một field là cả event bị bỏ (response `success: false`).
- Endpoint nằm sau middleware `check.whitelist`: domain LP phải có trong `config/whitelist.php` (hoặc tắt `whitelist.enabled`), và phải nằm trong `FRONTEND_URL` để qua CORS.
- Script dùng cookie first-party trên chính domain LP nên không vướng chặn third-party cookie, kể cả khi API khác domain.
