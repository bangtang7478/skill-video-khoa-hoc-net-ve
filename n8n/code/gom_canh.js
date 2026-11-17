// Gom URL ảnh + giọng của từng cảnh, tạo yêu cầu dựng 1 clip/cảnh cho FFmpeg Micro.
// ===== TÙY CHỈNH =====
const PHU_DE = true;            // hiện lời đọc ở dưới khung (FFmpeg Micro không làm được karaoke từng chữ)
const MAU_NEN = '0xF3E6CF';
// =====================
const canh = $('Tach canh').all();
const anh = $('Ve anh').all();
// Tìm URL file trong kết quả inference.sh (output.images[0].uri, output.audio, ... tùy app).
const timUrl = o => {
  if (!o) return null;
  if (typeof o === 'string') return /^(https?|inf):/.test(o) ? o : null;
  if (Array.isArray(o)) { for (const x of o) { const u = timUrl(x); if (u) return u; } return null; }
  if (typeof o === 'object') { for (const k of ['output', 'images', 'image', 'audio', 'uri', 'url']) { if (k in o) { const u = timUrl(o[k]); if (u) return u; } } }
  return null;
};
return $input.all().map((giongItem, i) => {
  const c = canh[i].json;
  const urlAnh = timUrl(anh[i].json.data ?? anh[i].json);
  const urlGiong = timUrl(giongItem.json.data ?? giongItem.json);
  if (!urlAnh) throw new Error('Cảnh ' + c.id + ': không thấy URL ảnh trong kết quả inference.sh: ' + JSON.stringify(anh[i].json).slice(0, 300));
  if (!urlGiong) throw new Error('Cảnh ' + c.id + ': không thấy URL giọng trong kết quả inference.sh: ' + JSON.stringify(giongItem.json).slice(0, 300));
  const zoom = '';
  const options = [
    { option: '-vf', argument: 'loop=loop=-1:size=1:start=0,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=' + MAU_NEN + ',fps=30,format=yuv420p' + zoom },
    { option: '-c:v', argument: 'libx264' },
    { option: '-preset', argument: 'veryfast' },
    { option: '-c:a', argument: 'aac' },
    { option: '-b:a', argument: '192k' },
    { option: '-shortest', argument: '' },
  ];
  if (PHU_DE) options.push({ option: '@text-overlay', argument: { text: c.loi,
    style: { position: 'bottom-center', fontSize: 46, fontColor: 'white', outlineThickness: 4, charsPerLine: 48, margin: 40 } } });
  return { json: { stt: c.stt, id: c.id, urlAnh, urlGiong,
    body: { inputs: [{ url: urlAnh }, { url: urlGiong }], outputFormat: 'mp4', options } } };
});
