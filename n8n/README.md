# Chạy bộ skill trên n8n Cloud (không dùng JSON2Video)

Workflow **"Video khoa hoc net ve (skill GitHub, khong JSON2Video)"** chạy toàn bộ quy trình của bộ skill trong repo này trên n8n Cloud.

## Cách hoạt động
1. **Lay skill tu GitHub**: mỗi lần chạy tải `SKILL.md` mới nhất từ thư mục `skills/` của repo này
   (tổng quát, kịch bản, vẽ tranh, giọng đọc). Sửa skill trên GitHub là lần chạy sau dùng bản mới.
   Khối STYLE lấy thẳng từ mục "Khóa phong cách" của skill vẽ tranh.
2. **Claude viet kich ban theo skill**: Claude đọc các skill và làm gộp bước 1 đến 4 (tiêu đề, kịch bản 6 nhịp, chia cảnh,
   prompt ảnh, lời đọc đã chuẩn hóa), trả về JSON.
3. **Ve anh / Doc giong**: gọi API inference.sh (Nano Banana 2 vẽ tranh 16:9, ElevenLabs đọc giọng) cho từng cảnh.
4. **Dung clip tung canh → Ghep clip**: FFmpeg Micro dựng mỗi cảnh thành clip (ảnh + giọng + phụ đề), rồi ghép theo nhóm 10 clip.
5. **Dang len YouTube** (tùy chọn): tải video về và đăng với tiêu đề, mô tả có nguồn, nhãn AI.

## Cần chuẩn bị
- Gói n8n Cloud còn hạn (bản dùng thử hết hạn thì không chạy được).
- 2 credential kiểu Custom Auth, nội dung `{"headers":{"Authorization":"Bearer <key>"}}`:
  - `inference.sh API key` (key `inf_...` tại inference.sh)
  - `FFmpeg Micro API key` (tại ffmpeg-micro.com, dịch vụ trả phí theo phút xử lý)
- Credential YouTube nếu muốn tự đăng.

## Gọi bằng webhook
```bash
curl -X POST https://<instance>.app.n8n.cloud/webhook/video-khoa-hoc-skill-github \
  -H 'Content-Type: application/json' \
  -d '{"chuDe":"Vì sao ta ngáp lây?","thoiLuong":2,"giong":"nam","youtube":"private"}'
```
`youtube`: `public` | `unlisted` | `private` | `khong`.

## Giới hạn so với chạy bằng script trên máy
- FFmpeg Micro không cho `-filter_complex`, nên phụ đề hiện **cả câu**, không phải karaoke từng chữ như `phu_de_karaoke.py`.
- Không có Python trên n8n Cloud nên không chạy được `them_chu.py`; chữ tiếng Việt trong tranh do model ảnh vẽ, có thể sai dấu.
- Không có nhạc nền và zoom nhẹ như `build_video.py`.
Muốn đúng 100% phong cách, chạy các script trong `skills/*/scripts/` trên máy có ffmpeg và Python.

## Tệp
- `video-khoa-hoc-skill-github.workflow-sdk.ts`: mã workflow (n8n Workflow SDK).
- `code/*.js`: mã các node Code, `prompt.txt`: prompt cho Claude.
