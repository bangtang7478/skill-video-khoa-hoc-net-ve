---
name: giong-doc-phu-de-karaoke
description: "Tạo giọng đọc tiếng Việt cho từng cảnh video khoa học (giọng thân thiện kiểu thầy giải thích) và phụ đề karaoke 2–4 chữ, chữ đang đọc đổi màu xanh lá (.ass), căn thời gian bằng faster-whisper. Dùng khi người dùng nói 'lồng tiếng video khoa học', 'giọng đọc cho kịch bản', 'phụ đề chạy chữ', 'sub karaoke', 'phụ đề từng chữ', hoặc là bước 4 của skill video-khoa-hoc-net-ve."
---

# Giọng đọc + phụ đề karaoke

Đầu vào: `work/scenes.json`. Đầu ra: `work/audio/<id>.mp3` (một file mỗi cảnh) + `work/captions.ass`.

## 1. Chọn giọng (một lần cho cả kênh)
Giọng mục tiêu: tiếng Việt chuẩn, **thân thiện, nhanh vừa (~180 chữ/phút), lên giọng ở câu hỏi**, như một người
giải thích cho bạn bè, không đọc kiểu tin tức.
- Thử 2–3 giọng trên cùng đoạn hook + 1 đoạn giải thích, gửi người dùng nghe, chốt `voice_id` và ghi vào `work/brief.md`.
- Dùng **cùng một giọng cho mọi video** để tạo nhận diện kênh.

```bash
# Inworld TTS (hỗ trợ tiếng Việt, điều khiển cảm xúc)
belt app run inworld/text-to-speech-2 --input '{"text": "<voice>", "voice_id": "<giọng tiếng Việt>", "delivery_mode": "BALANCED"}'
# Phương án khác: ElevenLabs multilingual (xem skill long-tieng-giong-doc)
```
Mỗi cảnh một lệnh, lưu đúng `work/audio/<id>.mp3`. Tạo song song được nhưng giữ đúng số id.

## 2. Chuẩn hóa chữ trước khi đọc
- Số → cách đọc mong muốn khi model đọc sai ("100.000" → "một trăm nghìn"; "3x3" → "ba nhân ba").
- Viết tắt/ký hiệu → chữ đầy đủ ("%" → "phần trăm", "km/h" → "ki lô mét một giờ").
- Thuật ngữ nước ngoài: giữ nguyên nếu model đọc ổn (caffeine, adenosine), nếu không thì phiên âm ("a-đê-nô-xin").
- Chỉ sửa chữ gửi TTS; `voice` trong `scenes.json` vẫn giữ cách viết đẹp để làm phụ đề.
  Nếu cần, lưu bản đọc vào trường `"tts"` riêng.

## 3. Kiểm tra âm thanh
- Nghe ngẫu nhiên 3 cảnh + cảnh đầu và cuối: đúng chữ, không nuốt chữ, không tiếng lạ.
- Cảnh lệch tông/sai → tạo lại riêng cảnh đó.
- Tổng thời lượng: `for f in work/audio/*.mp3; do ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"; done | paste -sd+ | bc`
  Bản ngắn nên rơi vào 100–140 giây; dài quá → cắt bớt câu ở nhịp giải thích.

## 4. Phụ đề karaoke
```bash
pip install faster-whisper   # nên có; không có thì script tự chia đều thời gian
python3 scripts/phu_de_karaoke.py work --words 3 --gap 0.3 --res 1920x1080
```
- Mỗi lần hiện **3 chữ** (ngắt sớm ở dấu câu), trắng viền đen dày, chữ đang đọc màu **xanh lá `#3BAA3B`**,
  đặt giữa phía dưới (cách đáy 5%).
- Script nhận dạng audio bằng whisper chỉ để lấy **mốc thời gian**; chữ hiển thị luôn lấy từ kịch bản nên đúng chính tả.
- `--gap` phải trùng với `--gap` khi dựng (`build_video.py`), mặc định 0.3 giây.
- Font: mặc định "Be Vietnam Pro ExtraBold" (cài font này trên máy dựng; libass sẽ dùng font thay thế nếu thiếu).
  Đổi bằng `--font "Tên font"`; đổi màu nhấn bằng `--hi FFD400`.
- Mở `captions.ass` bằng Aegisub hoặc xem bản dựng thử để soát lệch giờ; lệch đều thì chỉnh `--gap`.
