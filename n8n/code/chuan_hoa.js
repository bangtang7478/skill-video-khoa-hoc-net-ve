// Gom dữ liệu từ Form, Webhook hoặc nút chạy thử về cùng một dạng.
// Webhook: POST JSON {"chuDe": "...", "thoiLuong": 2, "giong": "nam"|"nu", "youtube": "public"|"unlisted"|"private"|"khong"}
const v = $json.body || $json;
const lay = (...ten) => { for (const t of ten) if (v[t] != null && v[t] !== '') return String(v[t]); return ''; };
const chuDe = lay('Chu de / cau hoi khoa hoc', 'chuDe', 'topic')
  || 'Ngủ đủ 8 tiếng có thật sự là con số đúng cho mọi người?';   // chủ đề mẫu khi bấm chạy thử
const phut = Math.min(10, Math.max(1, parseFloat(lay('Thoi luong (phut)', 'thoiLuong')) || 2));
const thoiLuong = Math.round(phut * 60);
const g = lay('Giong doc', 'giong');
const nu = /n[uữ]/i.test(g) && !/nam/i.test(g);
// Giọng ElevenLabs (đa ngôn ngữ, đọc được tiếng Việt). Đổi sang voice_id riêng ở node "Doc giong" nếu muốn.
const giong = nu ? 'alice' : 'george';
const ytRaw = lay('Dang YouTube', 'youtube') || 'private';
const youtube = /khong dang|^khong$|none|^no$/i.test(ytRaw) ? 'khong'
  : /unlisted|khong cong khai/i.test(ytRaw) ? 'unlisted'
  : /public|cong khai/i.test(ytRaw) ? 'public' : 'private';
const soCanh = Math.max(6, Math.min(60, Math.round(thoiLuong / 6)));   // mỗi cảnh khoảng 6 giây (theo skill kich-ban)
const soChu = Math.round(thoiLuong * 3);                             // khoảng 180 chữ/phút
return [{ json: { chuDe, phut, thoiLuong, giong, youtube, soCanh, soChu } }];
