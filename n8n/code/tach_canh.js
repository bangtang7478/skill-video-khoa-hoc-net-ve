// Đọc JSON kịch bản Claude trả về, tách mỗi cảnh thành một item và ghép prompt ảnh theo skill vẽ tranh.
const dv = $('Lay skill tu GitHub').first().json;
const layChu = v => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(layChu).join('')
  : typeof v === 'object' ? layChu(v.text ?? v.content ?? v.output ?? '') : String(v);
const raw = layChu($json.text ?? $json.output ?? $json.response).replace(/```(json)?/gi, '').trim();
let kb;
try { kb = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); }
catch (e) { throw new Error('Kịch bản AI không phải JSON hợp lệ: ' + raw.slice(0, 300)); }
const canh = (kb.canh || []).filter(c => c && c.loi);
if (!canh.length) throw new Error('Kịch bản không có cảnh nào');

// ===== TÙY CHỈNH: linh vật riêng của kênh (tiếng Anh, giữ cố định) =====
const HOST = 'the host scientist: a round-headed stick-figure scientist with small round glasses, an orange safety helmet, a green scarf and a white lab coat, holding a pointer stick';
const VIEWER = 'the viewer: a round-headed stick-figure person with a few messy hair strokes and a plain blue t-shirt';
// ======================================================================
const nv = k => /both/i.test(k) ? HOST + '; ' + VIEWER + '. ' : /host/i.test(k) ? HOST + '. ' : /viewer|ban/i.test(k) ? VIEWER + '. ' : '';
const sach = s => String(s || '').replace(/[<>]/g, '').trim();
const tags = (Array.isArray(kb.tags) ? kb.tags : String(kb.tags || '').split(',')).map(t => sach(t).replace(/#/g, '')).filter(Boolean).slice(0, 12);
const nguon = (Array.isArray(kb.nguon) ? kb.nguon : [kb.nguon]).map(sach).filter(Boolean);
const tieuDe = sach(kb.tieuDe || dv.chuDe).slice(0, 100);
const youtube = {
  tieuDe, cheDo: dv.youtube, danhMuc: '27', tags: tags.join(',').slice(0, 450),
  moTa: [sach(kb.moTa), '', nguon.length ? 'Nguồn tham khảo:\n' + nguon.map(n => '- ' + n).join('\n') : '', '',
         'Video được tạo với sự hỗ trợ của AI.', tags.map(t => '#' + t.replace(/\s+/g, '')).join(' ')].join('\n').slice(0, 4900),
};
return canh.map((c, i) => ({ json: {
  stt: i, id: String(i + 1).padStart(3, '0'), tongCanh: canh.length,
  loi: sach(c.loi), tts: sach(c.tts || c.loi), giong: dv.giong,
  promptAnh: nv(c.nhanVat || '') + sach(c.anh_en) + ', ' + dv.style + ', no watermark',
  youtube,
} }));
