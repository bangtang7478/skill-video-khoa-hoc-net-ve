# Chạy trên n8n

Workflow **"Video khoa hoc net ve + dang YouTube"** làm toàn bộ quy trình của bộ skill ngay trên n8n, không cần máy có ffmpeg:

`Form/Webhook → Claude viết kịch bản 6 nhịp (JSON) → dựng JSON video → JSON2Video (vẽ tranh flux-schnell, giọng Azure tiếng Việt, tiêu đề đỏ/banner, phụ đề 3 chữ chữ đang đọc xanh lá) → chờ render → đăng YouTube`

## File
| File | Dùng để |
|---|---|
| `video-khoa-hoc-net-ve.n8n.json` | Import vào n8n: Workflows → Import from File |
| `video-khoa-hoc-net-ve.workflow-sdk.ts` | Cùng workflow viết bằng n8n Workflow SDK (cho MCP/AI builder) |
| `prompt.txt` | Prompt cho Claude viết kịch bản |
| `dung_json.js` | Code node dựng JSON video, có mục **TÙY CHỈNH** (linh vật, màu, font, nhạc nền) |
| `chuan_hoa.js`, `gioi_han.js` | Code node chuẩn hóa đầu vào và giới hạn thời gian chờ |

## Cần chuẩn bị sau khi import
1. **Claude**: chọn credential Anthropic cho node *Claude Chat Model* (hoặc dùng AI credits có sẵn của n8n Cloud).
2. **JSON2Video**: tạo credential *Header Auth* tên header `x-api-key`, giá trị là API key JSON2Video; gán cho 2 node *Gui tao video* và *Kiem tra video*.
3. **YouTube**: gán credential YouTube OAuth2 cho node *Dang len YouTube*. Mặc định đăng **Riêng tư**.
4. (Tùy chọn) Dán link .mp3 nhạc nền vào `NHAC_NEN` trong node *Dung JSON video*, đổi `LINH_VAT` thành linh vật riêng của kênh.

## Chạy
- Mở Form (URL ở node *Form nhap chu de*), hoặc gọi webhook:
```bash
curl -X POST https://<n8n-cua-ban>/webhook/tao-video-khoa-hoc-net-ve \
  -H 'Content-Type: application/json' \
  -d '{"chuDe":"Vì sao ta ngáp lây?","thoiLuong":2,"giong":"nam","youtube":"private"}'
```
`youtube`: `public` | `unlisted` | `private` | `khong` (không đăng). Video 2 phút mất khoảng 5–15 phút.

## Giới hạn so với bản chạy bằng script
- Ảnh do flux-schnell vẽ nên linh vật có thể lệch nhẹ giữa các cảnh (không truyền được ảnh tham chiếu). Muốn đồng nhất hơn, thay bằng model ảnh có tham chiếu (Nano Banana, GPT Image) qua HTTP Request rồi đưa URL ảnh vào trường `src`.
- Chữ trong tranh được chèn bằng lớp text của JSON2Video (không để model ảnh viết chữ), nên dấu tiếng Việt luôn đúng.
