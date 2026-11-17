---
name: ve-tranh-khoa-hoc-net-don-gian
description: "Thiết kế linh vật và tạo ảnh từng cảnh cho video khoa học theo phong cách hoạt hình nét mực dày, tô màu phẳng, người que đầu tròn, chữ tiếng Việt in hoa trong tranh (16:9), giữ nhất quán nhân vật bằng ảnh tham chiếu. Dùng khi người dùng nói 'vẽ tranh cho video khoa học', 'tạo ảnh minh họa kiểu người que', 'thiết kế linh vật kênh khoa học', 'ảnh giải thích nét vẽ', hoặc là bước 3 của skill video-khoa-hoc-net-ve."
---

# Vẽ tranh khoa học nét đơn giản

Đầu vào: `work/scenes.json`. Đầu ra: `work/mascot/*.png`, `work/scenes/<id>.png` (1920x1080 hoặc 16:9).

## 1. Khóa phong cách (STYLE — dán vào cuối MỌI prompt)
```
, simple hand-drawn educational cartoon, thick black ink outlines, flat colors, minimal shading,
round-headed stick-figure characters with big expressive faces, clean pastel flat background,
whiteboard explainer doodle style, slightly rough marker texture, 16:9 composition,
lots of empty space, centered subject, high contrast, no gradients, no photorealism
```
Bảng màu gợi ý: nền be `#F3E6CF`, xanh nhạt `#CFE3EA`, trắng `#FFFFFF`, xanh đêm `#2E3A5C`;
nhấn **đỏ** `#D7262B` (tiêu đề, banner), xanh lá `#3BAA3B` (đúng/tốt), vàng `#F6C945`.

## 2. Linh vật (làm một lần, dùng mãi)
Kênh cần 1–2 nhân vật lặp lại. **Tự thiết kế mới**, đừng chép nhân vật của kênh khác.
- **Người dẫn/chuyên gia**: chọn đặc điểm riêng dễ nhận (VD: người que đầu tròn đội mũ bảo hiểm phòng thí nghiệm màu cam,
  khăn quàng xanh lá, cầm bút chỉ; hoặc robot nhỏ đầu bóng đèn). Ghi vào `work/mascot/mascot.md`: tên, hình dáng, màu, phụ kiện, tính cách.
- **"Bạn" (khán giả)**: người que đầu tròn, tóc vài nét, áo phông một màu cố định.
Tạo sheet tham chiếu:
```bash
belt app run google/gemini-3-1-flash-image --input '{
  "prompt": "character reference sheet of <mô tả linh vật>, front view, 3/4 view, side view, 4 expressions (happy, surprised, confused, explaining), white background, no text + STYLE",
  "aspect_ratio": "16:9"
}'
```
Chọn 1 ảnh đẹp nhất, lưu `work/mascot/host.png` (và `you.png`). Upload lấy URL để truyền vào `images` ở mọi cảnh có nhân vật đó.

## 3. Prompt mỗi cảnh
Cấu trúc: `[bố cục/thủ pháp] + [nhân vật + hành động + biểu cảm] + [vật/ẩn dụ] + [chữ trong tranh] + STYLE`

Chữ trong tranh (lấy từ `onscreen_text`):
- Tiêu đề: `bold red uppercase hand-lettered Vietnamese title at the top that reads exactly: "NHU CẦU NGỦ KHÁC NHAU"`
- Nhãn: `black uppercase hand-lettered label "CAFFEINE" with an arrow pointing to ...`
- Banner: `red rectangular banner with bold white text "ĐỦ 8 TIẾNG" at bottom center`
- Chừa **1/6 dưới cùng trống** (không vật quan trọng) cho phụ đề karaoke.

```bash
belt app run google/gemini-3-1-flash-image --input '{
  "prompt": "<prompt cảnh>",
  "aspect_ratio": "16:9",
  "images": ["<url host.png>"]
}'
```
Phương án khác: GPT Image hoặc Seedream (xem skill `tao-anh-khung-hinh` / `tao-sua-anh-nano-banana`).

Ví dụ (tự viết):
```
Split-screen composition: left half dark navy night bedroom, a round-headed stick figure sleeping, clock showing 11;
right half warm beige morning, the same stick figure stretching happily, clock showing 7; big white arrow in the middle;
hand-lettered labels "11 GIỜ ĐÊM" on the left and "7 GIỜ SÁNG" on the right; red banner "ĐỦ 8 TIẾNG" bottom center + STYLE
```

## 4. Khi chữ tiếng Việt bị lỗi dấu
Model ảnh đôi khi viết sai dấu. Cách xử lý (theo thứ tự):
1. Tạo lại 1–2 lần với chữ ngắn hơn.
2. Tạo ảnh **không chữ** (`no text` + chừa khoảng trống phía trên), rồi chèn chữ bằng script:
```bash
python3 scripts/them_chu.py work/scenes/003.png work/scenes/003.png \
  --title "NHU CẦU NGỦ KHÁC NHAU" --banner "ĐỦ 8 TIẾNG"
```
Script vẽ tiêu đề đỏ in hoa ở trên, banner đỏ chữ trắng ở dưới, viền nhẹ, font có dấu tiếng Việt.

## 5. Kiểm tra từng ảnh (tạo lại nếu sai)
- [ ] Đúng phong cách nét dày/tô phẳng (không lẫn ảnh 3D/ảnh thật).
- [ ] Linh vật đúng màu/phụ kiện như sheet.
- [ ] Chữ đúng chính tả, đọc được ở cỡ điện thoại.
- [ ] Không có tay/ngón thừa gây chú ý, không chữ rác, không watermark.
- [ ] 1/6 dưới cùng trống cho phụ đề.
Làm 3 ảnh mẫu → cho người dùng duyệt → mới tạo hàng loạt. Cảnh nối tiếp cùng bối cảnh có thể dùng lại ảnh (copy với id mới) hoặc sửa nhẹ bằng ảnh tham chiếu để tiết kiệm.

## 6. (Tùy chọn) Làm động 10–20% cảnh
Cảnh `motion: true`: image-to-video 3–5 giây, chuyển động nhỏ, giữ nguyên nét vẽ.
```bash
belt app run falai/wan-2-5-i2v --input '{"image": "<url ảnh>", "prompt": "subtle 2D cartoon animation, character blinks and moves arms slightly, text stays static and unchanged, no camera movement"}'
```
Lưu `work/scenes/<id>.mp4` (ưu tiên hơn ảnh cùng id khi dựng). Kiểm tra chữ không bị méo trong clip.

## 7. Thumbnail
Dùng ảnh cảnh hook (thường là cảnh 001), thêm tiêu đề ngắn 3–5 chữ cỡ lớn bằng `them_chu.py --title`, xuất `work/thumbnail.png` 1280x720.
