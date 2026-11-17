---
name: dung-video-khoa-hoc
description: "Dựng video giải thích khoa học nét vẽ bằng ffmpeg: ghép ảnh tĩnh theo lời đọc (đổi cảnh 4–8 giây, zoom rất nhẹ, cắt thẳng), đốt phụ đề karaoke, nhạc nền tự hạ khi có giọng, avatar kênh, chuẩn âm lượng, xuất 16:9 rồi soát lỗi và chuẩn bị tiêu đề/mô tả/thumbnail để đăng. Dùng khi người dùng nói 'dựng video khoa học', 'ghép ảnh và giọng thành video', 'xuất video', 'đăng video', hoặc là bước 5 của skill video-khoa-hoc-net-ve."
---

# Dựng và xuất bản video khoa học nét vẽ

Đầu vào: thư mục `work/` (ảnh, audio, captions.ass, music). Đầu ra: `out.mp4`, `work/thumbnail.png`, `work/dang-bai.md`.

## 1. Nhạc nền (tùy chọn)
Nhạc nhẹ, vui, tò mò, **không lời**, nhỏ hơn giọng nhiều:
```bash
belt app run infsh/diffrythm --input '{"prompt": "light playful curious background music for educational explainer, pizzicato strings, soft marimba, ukulele, no vocals, steady 100 bpm"}'
```
Lưu `work/music.mp3` (script tự lặp và tự hạ khi có giọng). Hoặc dùng nhạc miễn phí bản quyền (YouTube Audio Library), ghi nguồn.

## 2. Dựng
```bash
python3 scripts/build_video.py work out.mp4 --res 1920x1080 --gap 0.3 --zoom 0.04 --music-vol 0.10
```
Script làm:
- Mỗi cảnh dài = lời đọc + `--gap` giây; ảnh zoom rất nhẹ (4%) luân phiên vào/ra; clip `.mp4` (nếu có) được lặp; **cắt thẳng** giữa cảnh, không hiệu ứng chuyển cảnh.
- Đốt `captions.ass` (phụ đề karaoke). Thiếu font thì thêm `--fontsdir <thư mục chứa .ttf>`.
- `work/avatar.png` (nếu có) đặt nhỏ góc dưới phải.
- Nhạc nền sidechain theo giọng, chuẩn âm lượng −14 LUFS (hợp Facebook/YouTube), H.264 + AAC, faststart.
Video dài (nhiều chương): dựng từng chương bằng một thư mục work riêng, rồi nối:
`ffmpeg -f concat -safe 0 -i chuong.txt -c copy full.mp4`.

## 3. Kiểm tra trước khi giao
```bash
for t in 1 30 60 90; do ffmpeg -v error -y -ss $t -i out.mp4 -frames:v 1 check_$t.png; done
```
- [ ] Xem các khung: chữ trong tranh rõ, phụ đề không đè lên chữ/banner quan trọng (nếu đè: sửa ảnh chừa đáy trống).
- [ ] Phụ đề khớp giọng ở đầu, giữa, cuối (lệch đều → chỉnh `--gap` cả hai script; lệch từng đoạn → cài faster-whisper).
- [ ] Nhạc không lấn giọng; không có khoảng im lặng lạ giữa cảnh.
- [ ] Thời lượng đúng mục tiêu (bản ngắn ~2 phút).
- [ ] Cảnh cuối có câu hỏi cho khán giả + CTA.

## 4. Thumbnail
Lấy ảnh cảnh hook, thêm tiêu đề 3–5 chữ:
```bash
python3 ../ve-tranh-khoa-hoc-net-don-gian/scripts/them_chu.py work/scenes/001.png work/thumbnail.png --title "NGỦ 8 TIẾNG LÀ SAI?" --size 1280x720 --title-scale 1.5
```

## 5. Nội dung đăng bài (`work/dang-bai.md`)
```
Tiêu đề/caption: <tiêu đề chính từ brief>
Mô tả (2–3 câu): tóm tắt điều bất ngờ + câu hỏi cho khán giả.
Nguồn tham khảo: <danh sách nguồn từ brief>
Hashtag (3–5): #khoahoc #giaithich #<chủ đề> ...
Ghi chú: bật nhãn "Nội dung do AI tạo"; chọn ảnh bìa = thumbnail.png
```
Đăng 16:9 dạng video/Reels; nếu cần bản dọc 9:16 cho Reels/TikTok, đặt video 16:9 vào giữa khung 1080x1920 nền màu chủ đạo
và đưa tiêu đề lên phần trống phía trên:
`ffmpeg -i out.mp4 -vf "scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:color=0xF3E6CF" -c:a copy out_doc.mp4`
