// Gom dữ liệu từ Form, Webhook hoặc nút chạy thử về cùng một dạng.
// Webhook: POST JSON {"chuDe": "...", "thoiLuong": 2, "giong": "nam"|"nu", "youtube": "public"|"unlisted"|"private"|"khong"}
const v = $json.body || $json;
const lay = (...ten) => { for (const t of ten) if (v[t] != null && v[t] !== '') return String(v[t]); return ''; };
const chuDe = lay('Chu de / cau hoi khoa hoc', 'chuDe', 'topic')
  || 'Ngủ đủ 8 tiếng có thật sự là con số đúng cho mọi người?';   // chủ đề mẫu khi bấm chạy thử
const phut = Math.min(15, Math.max(1, parseFloat(lay('Thoi luong (phut)', 'thoiLuong')) || 2));
const thoiLuong = Math.round(phut * 60);
const nu = /n[uữ]/i.test(lay('Giong doc', 'giong')) && !/nam/i.test(lay('Giong doc', 'giong'));
const giong = nu ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
const ytRaw = lay('Dang YouTube', 'youtube') || 'private';
const youtube = /khong dang|^khong$|none|^no$/i.test(ytRaw) ? 'khong'
  : /unlisted|khong cong khai/i.test(ytRaw) ? 'unlisted'
  : /public|cong khai/i.test(ytRaw) ? 'public' : 'private';
// Mỗi cảnh khoảng 6 giây, giọng đọc khoảng 3 chữ/giây (180 chữ/phút).
const soCanh = Math.max(8, Math.min(120, Math.round(thoiLuong / 6)));
const soChu = Math.round(thoiLuong * 3);
return [{ json: { chuDe, phut, thoiLuong, giong, youtube, soCanh, soChu, thoiGian: Date.now() } }];
