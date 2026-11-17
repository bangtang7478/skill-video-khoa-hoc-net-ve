---
name: video-khoa-hoc-net-ve
description: "Điều phối toàn bộ quy trình làm video giải thích khoa học bằng tranh nét vẽ đơn giản (người que, chữ tiếng Việt trong tranh, giọng đọc + phụ đề karaoke, khung 16:9, 2 phút hoặc dài). Dùng khi người dùng nói 'làm video khoa học', 'video giải thích kiểu vẽ tay', 'video khoa học nét vẽ', 'làm video như kênh vẽ khoa học', hoặc đưa một chủ đề/câu hỏi khoa học và muốn ra video hoàn chỉnh."
---

# Video giải thích khoa học bằng tranh nét vẽ (quy trình tổng)

> Trả lời và viết sản phẩm bằng tiếng Việt. Prompt gửi cho model ảnh/âm thanh viết bằng tiếng Anh, riêng **chữ hiển thị trong tranh** giữ tiếng Việt.

Phong cách mục tiêu (chi tiết: `references/phan-tich-phong-cach.md`):
- 16:9, 1920x1080. Bản ngắn **~2 phút** (18–25 ảnh), bản dài **10–16 phút** (chia chương).
- Tranh hoạt hình nét mực dày, tô phẳng, người que đầu tròn, chữ tiếng Việt IN HOA ngay trong tranh (tiêu đề đỏ).
- Ảnh tĩnh đổi mỗi 4–8 giây, zoom rất nhẹ, cắt thẳng.
- Một giọng đọc tiếng Việt thân thiện + phụ đề karaoke (2–4 chữ, chữ đang đọc màu xanh lá) + nhạc nền nhỏ.
- Mở bằng câu hỏi đi ngược niềm tin phổ biến, kết bằng câu hỏi cho khán giả + CTA đăng ký.

## Công cụ
- `belt` CLI (inference.sh) để tạo ảnh, giọng, nhạc: `belt login` trước. Chưa có thì xem skill `tao-video-ai`.
- `ffmpeg`, `python3`; `pip install faster-whisper` để căn thời gian phụ đề.

## Dây chuyền (mỗi bước có skill riêng)
| # | Bước | Skill | Đầu ra |
|---|---|---|---|
| 1 | Chọn chủ đề, góc nhìn, tiêu đề | `chu-de-tieu-de-khoa-hoc` | `work/brief.md` |
| 2 | Viết kịch bản chia cảnh | `kich-ban-khoa-hoc-de-hieu` | `work/scenes.json` |
| 3 | Khóa linh vật + vẽ ảnh từng cảnh | `ve-tranh-khoa-hoc-net-don-gian` | `work/scenes/001.png…` |
| 4 | Giọng đọc + phụ đề karaoke | `giong-doc-phu-de-karaoke` | `work/audio/001.mp3…`, `work/captions.ass` |
| 5 | Dựng, nhạc, xuất bản | `dung-video-khoa-hoc` | `out.mp4`, thumbnail, mô tả |

Thư mục làm việc chuẩn:
```
work/
  brief.md          # chủ đề, tiêu đề, thông điệp, nguồn tham khảo
  mascot/           # ảnh tham chiếu linh vật (khóa ở bước 3)
  scenes.json       # danh sách cảnh: id, voice, visual, onscreen_text
  scenes/001.png    # ảnh mỗi cảnh (hoặc 001.mp4 nếu làm động)
  audio/001.mp3     # lời đọc mỗi cảnh, cùng số id
  captions.ass      # phụ đề karaoke toàn video
  music.mp3         # nhạc nền (tùy chọn)
```

## Cách chạy
1. Hỏi người dùng (một lần, gộp): chủ đề hoặc để bạn đề xuất; bản ngắn hay dài; tên kênh + linh vật đã có chưa; giọng nam/nữ.
   Không chờ được thì mặc định: bản ngắn 2 phút, giọng nam trẻ thân thiện, linh vật mới.
2. Chạy lần lượt bước 1→5. **Dừng cho người dùng duyệt** sau bước 2 (kịch bản) và sau khi có 3 ảnh mẫu ở bước 3,
   vì tạo hàng loạt ảnh/giọng là tốn phí.
3. Trước khi tạo hàng loạt, báo ước tính: số ảnh × giá ảnh, số ký tự TTS, số clip i2v (nếu có).
4. Kiểm tra cuối (xem `dung-video-khoa-hoc` mục Kiểm tra) rồi bàn giao: video, thumbnail, tiêu đề, mô tả có nguồn.

## Nguyên tắc
- Tạo bản sắc riêng: linh vật, tên kênh, màu chủ đạo của người dùng. **Không** chép linh vật, logo, tên hay nguyên kịch bản của kênh khác.
- Kiểm chứng mọi con số và khẳng định khoa học; ghi nguồn ở mô tả. Tiêu đề được phép gây tò mò nhưng nội dung không được sai.
- Bật nhãn nội dung AI khi đăng (Facebook/YouTube yêu cầu).
- Không đưa lời khuyên y tế cụ thể thay bác sĩ; chủ đề sức khỏe kết bằng "nếu kéo dài, hãy hỏi bác sĩ".
