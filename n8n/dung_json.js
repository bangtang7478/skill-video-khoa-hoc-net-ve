// Ghép kịch bản AI thành JSON gửi JSON2Video, theo phong cách tranh nét vẽ giải thích khoa học.
const dv = $('Chuan hoa dau vao').item.json;
const layChu = v => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(layChu).join('')
  : typeof v === 'object' ? layChu(v.text ?? v.content ?? v.output ?? v.message ?? '') : String(v);
let raw = layChu($json.text ?? $json.output ?? $json.response ?? $json.content).replace(/```(json)?/gi, '').trim();
const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
let kb;
try { kb = JSON.parse(raw.slice(a, b + 1)); }
catch (e) { throw new Error('Không đọc được kịch bản AI trả về (JSON lỗi): ' + raw.slice(0, 400)); }
const canhAI = (kb.canh || []).filter(c => c && c.loi);
if (!canhAI.length) throw new Error('Kịch bản AI không có cảnh nào: ' + raw.slice(0, 400));

// ===== TÙY CHỈNH =====
// Linh vật của kênh (bạn tự đặt, viết bằng tiếng Anh, giữ cố định để nhân vật giống nhau qua các cảnh).
const LINH_VAT = 'a round-headed stick-figure scientist with small round glasses, an orange safety helmet, a green scarf and a white lab coat, holding a pointer stick';
const NGUOI_XEM = 'a round-headed stick-figure person with a few messy hair strokes and a plain blue t-shirt';
// Phong cách hình: hoạt hình giải thích nét mực dày, tô màu phẳng.
const PHONG_CACH = 'simple hand-drawn educational explainer cartoon, thick black ink outlines, flat colors, minimal shading, ' +
  'round-headed stick figures with big expressive faces, clean pastel flat background, lots of empty space at the top and bottom, ' +
  'whiteboard doodle style, slightly rough marker texture, no text, no letters, no words, no numbers, no watermark';
const MAU_DO = '#D7262B', MAU_XANH = '#3BAA3B';
const FONT = 'Be Vietnam Pro';
// Nhạc nền: dán link trực tiếp tới file .mp3 nhạc nhẹ, vui, không lời mà bạn có quyền dùng. Để trống = không nhạc.
const NHAC_NEN = '';
const AM_LUONG_NHAC = 0.1;
// =====================

const W = 1920, H = 1080;
const nhanVat = c => /host|linh/i.test(c.nhanVat || '') ? LINH_VAT + ', '
  : /ban|you|viewer/i.test(c.nhanVat || '') ? NGUOI_XEM + ', '
  : /both|ca hai/i.test(c.nhanVat || '') ? LINH_VAT + ' and ' + NGUOI_XEM + ', ' : '';
const sach = s => String(s || '').replace(/[<>]/g, '').trim();

const scenes = canhAI.map((c, i) => {
  const elements = [{
    type: 'image', model: 'flux-schnell',
    prompt: nhanVat(c) + sach(c.anh || 'a curious stick figure looking at a big question mark') + ', ' + PHONG_CACH,
    duration: -2, resize: 'cover', width: W, height: H, x: 0, y: 0, zoom: i % 2 ? -1 : 1,
  }];
  const tieuDe = sach(c.tieuDeCanh).toUpperCase();
  if (tieuDe) elements.push({ type: 'text', style: '001', text: tieuDe, duration: -2,
    x: 60, y: 40, width: W - 120, height: 170,
    settings: { 'font-family': FONT, 'font-size': '84px', 'font-weight': '800', color: MAU_DO, 'text-align': 'center',
                'text-shadow': '3px 3px 0 #FFFFFF, -3px -3px 0 #FFFFFF, 3px -3px 0 #FFFFFF, -3px 3px 0 #FFFFFF' } });
  const banner = sach(c.banner).toUpperCase();
  if (banner) elements.push({ type: 'text', style: '001', text: banner, duration: -2,
    x: Math.round(W * 0.25), y: Math.round(H * 0.66), width: Math.round(W * 0.5), height: 130,
    settings: { 'font-family': FONT, 'font-size': '72px', 'font-weight': '800', color: '#FFFFFF', 'text-align': 'center',
                'background-color': MAU_DO, 'border': '6px solid #191919', 'padding': '10px 30px' } });
  elements.push({ type: 'voice', text: sach(c.loi), voice: dv.giong, model: 'azure' });
  return { 'background-color': '#F3E6CF', elements };   // cắt thẳng giữa các cảnh, không hiệu ứng chuyển
});

const elements = [{ type: 'subtitles', language: 'vi', settings: {
  style: 'classic', 'font-family': FONT, 'font-size': 64, 'word-color': MAU_XANH, 'line-color': '#FFFFFF',
  'outline-color': '#000000', 'outline-width': 8, 'max-words-per-line': 3, position: 'bottom-center' } }];
if (NHAC_NEN) elements.unshift({ type: 'audio', src: NHAC_NEN, volume: AM_LUONG_NHAC, duration: -2, loop: -1 });
const movie = { resolution: 'full-hd', quality: 'high', scenes, elements };

const tags = (Array.isArray(kb.tags) ? kb.tags : String(kb.tags || '').split(','))
  .map(t => sach(t).replace(/#/g, '')).filter(Boolean).slice(0, 12);
const nguon = (Array.isArray(kb.nguon) ? kb.nguon : [kb.nguon]).map(sach).filter(Boolean);
const tieuDeYT = sach(kb.tieuDe || dv.chuDe).slice(0, 100);
const moTaYT = [
  sach(kb.moTa),
  '',
  nguon.length ? 'Nguồn tham khảo:\n' + nguon.map(n => '- ' + n).join('\n') : '',
  '',
  'Video được tạo với sự hỗ trợ của AI.',
  tags.map(t => '#' + t.replace(/\s+/g, '')).join(' '),
].join('\n').slice(0, 4900);
const youtube = { tieuDe: tieuDeYT, moTa: moTaYT, tags: tags.join(',').slice(0, 450), cheDo: dv.youtube, danhMuc: '27' };  // 27 = Giáo dục
return [{ json: { chuDe: dv.chuDe, tieuDe: tieuDeYT, kichBan: canhAI, youtube, movie } }];
