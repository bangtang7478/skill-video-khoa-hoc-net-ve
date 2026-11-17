---
name: kich-ban-khoa-hoc-de-hieu
description: "Viết kịch bản lời đọc tiếng Việt cho video giải thích khoa học nét vẽ và chia thành cảnh 4–8 giây kèm mô tả hình và chữ trong tranh (scenes.json). Dùng khi người dùng nói 'viết kịch bản video khoa học', 'chia cảnh cho video giải thích', 'kịch bản 2 phút', 'kịch bản dài nhiều chương', hoặc là bước 2 của skill video-khoa-hoc-net-ve."
---

# Kịch bản giải thích khoa học dễ hiểu

Đầu vào: `work/brief.md` (từ skill `chu-de-tieu-de-khoa-hoc`). Đầu ra: `work/script.md` + `work/scenes.json`.

## 1. Độ dài
Giọng đọc tiếng Việt nhịp vừa ≈ **170–190 chữ/phút** (chữ = âm tiết).
- Bản ngắn 2 phút: **330–380 chữ**, 18–25 cảnh.
- Bản dài 12–16 phút: 2.200–2.900 chữ, 6–10 chương × 250–350 chữ; mỗi chương mở bằng một câu hỏi con.

## 2. Khung 6 nhịp (bản ngắn; tỉ lệ thời gian)
| Nhịp | % | Nội dung | Mẹo |
|---|---|---|---|
| 1. Hook | 5% | Câu hỏi/khẳng định gây sốc = tiêu đề | ≤ 15 chữ |
| 2. Niềm tin phổ biến | 10% | "Ai cũng được dạy rằng…" | Cho khán giả gật đầu |
| 3. Cú lật | 10% | "Nhưng thực ra…", một con số bất ngờ | 1 con số, có nguồn |
| 4. Giải thích | 50% | 3–5 ý, mỗi ý: cơ chế → ví von đời thường → hệ quả | Một ý ≈ 2–4 cảnh |
| 5. Áp dụng | 15% | "Vậy bạn nên…" 2–3 việc cụ thể | Không thay lời bác sĩ |
| 6. Câu hỏi + CTA | 10% | Hỏi trải nghiệm khán giả, mời theo dõi/đăng ký | Câu hỏi dễ trả lời bằng 1 con số/1 từ |

## 3. Giọng văn
- Xưng "bạn", câu ngắn (≤ 20 chữ), 1 ý/câu. Dùng từ thường ngày; thuật ngữ phải giải thích ngay bằng ví von
  ("adenosine giống như cát tích dần trong đồng hồ cát buồn ngủ").
- Chuyển ý bằng từ nối nói: "Nhưng", "Thực ra", "Điều thú vị là", "Vậy thì", "Và đây mới là phần hay nhất".
- Mỗi 20–30 giây có một "móc giữ chân": câu hỏi tu từ hoặc hứa hẹn ("lát nữa bạn sẽ thấy vì sao con số 8 lại sai").
- Viết số để đọc tự nhiên: "8 tiếng", "100.000 năm"; tránh ký hiệu khó đọc (%, ~, /) → viết "phần trăm", "khoảng".

## 4. Chia cảnh
Mỗi cảnh = 1 ảnh = **1–2 câu, 12–25 chữ (≈ 4–8 giây)**. Đổi cảnh khi đổi ý, đổi vật, hoặc khi cần nhấn số liệu.
Mỗi cảnh ghi:
- `voice`: lời đọc chính xác.
- `visual`: mô tả hình bằng tiếng Việt (nhân vật, hành động, biểu cảm, vật, bố cục), chọn một thủ pháp ở bảng dưới.
- `onscreen_text`: chữ IN HOA hiện trong tranh, tối đa **6 từ cho tiêu đề** + 1–3 nhãn ngắn. Rút gọn ý chính, không chép nguyên câu đọc.

| Thủ pháp hình | Dùng khi |
|---|---|
| Chia đôi khung trái/phải + mũi tên | So sánh trước/sau, đêm/ngày, đúng/sai |
| Kính lúp/vòng tròn phóng to | Cơ chế bên trong cơ thể, tế bào, phân tử |
| Biểu đồ cột/đường đơn giản | Số liệu, tăng giảm |
| Bong bóng suy nghĩ + "?" | Đặt câu hỏi, nhầm lẫn |
| Vật biểu tượng phóng đại | Ẩn dụ (pin = năng lượng, quả tạ = gánh nặng, tủ kính = hiếm) |
| Hai nhân vật đối diện | Đối thoại, so tài, khán giả vs chuyên gia |
| Linh vật chỉ tay + bảng đen | Giới thiệu khái niệm mới |

Cảnh cuối luôn là: linh vật + câu hỏi cho khán giả; cảnh CTA: ngón cái, nút ĐĂNG KÝ, chuông (2–3 giây).

## 5. Định dạng `work/scenes.json`
```json
[
  {"id": "001", "beat": "hook",
   "voice": "Ngủ đủ 8 tiếng mà sáng dậy vẫn mệt rã rời?",
   "visual": "Khung chia đôi: trái nền xanh đêm, người que ngủ, đồng hồ 11 giờ; phải nền be sáng, người que dậy vươn vai, đồng hồ 7 giờ; mũi tên trắng lớn ở giữa",
   "onscreen_text": {"title": "", "labels": ["11 GIỜ ĐÊM", "7 GIỜ SÁNG"], "banner": "ĐỦ 8 TIẾNG"},
   "motion": false}
]
```
- `motion: true` cho tối đa 10–20% cảnh (cảnh cao trào) nếu người dùng muốn làm động.
- Bản dài thêm trường `"chapter": 1..N`.

## 6. Tự kiểm trước khi giao
- [ ] Tổng chữ đúng mục tiêu; không cảnh nào > 30 chữ.
- [ ] Mọi con số có nguồn trong `brief.md`; không khẳng định quá mức nguồn nói.
- [ ] Tiêu đề được trả lời rõ trong nhịp 3–4.
- [ ] Mỗi `visual` vẽ được bằng người que + vật đơn giản (không cần ảnh chụp thật, không cần người nổi tiếng).
- [ ] `onscreen_text` ngắn, đúng chính tả tiếng Việt có dấu.
Đưa `script.md` (lời đọc liền mạch) cho người dùng duyệt trước khi sang bước vẽ.
