import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, languageModel, expr } from '@n8n/workflow-sdk';

const manual = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Bam de chay thu' } });

const form = trigger({
  type: 'n8n-nodes-base.formTrigger', version: 2.2,
  config: { name: 'Form nhap chu de', parameters: {
    formTitle: 'Tạo video giải thích khoa học (tranh nét vẽ)',
    formDescription: 'Nhập một chủ đề hoặc câu hỏi khoa học. n8n sẽ viết kịch bản, vẽ tranh người que, lồng tiếng, chèn phụ đề chạy chữ và ghép video 16:9. Video 2 phút mất khoảng 5-15 phút.',
    formFields: { values: [
      { fieldLabel: 'Chu de / cau hoi khoa hoc', placeholder: 'Ví dụ: Vì sao ta ngáp lây khi thấy người khác ngáp?', requiredField: true },
      { fieldLabel: 'Thoi luong (phut)', fieldType: 'dropdown', fieldOptions: { values: [{ option: '1' }, { option: '2' }, { option: '3' }, { option: '5' }, { option: '10' }] }, requiredField: true },
      { fieldLabel: 'Giong doc', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Nam' }, { option: 'Nu' }] }, requiredField: true },
      { fieldLabel: 'Dang YouTube', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Rieng tu' }, { option: 'Khong cong khai (ai co link moi xem)' }, { option: 'Cong khai' }, { option: 'Khong dang' }] }, requiredField: true }
    ] },
    options: { respondWithOptions: { values: { formSubmittedText: 'Đã nhận! Video đang được làm, khoảng 5-15 phút sẽ xong và tự đăng YouTube nếu bạn chọn.' } } }
  },
  output: [{ 'Chu de / cau hoi khoa hoc': 'Vì sao ta ngáp lây?', 'Thoi luong (phut)': '2', 'Giong doc': 'Nam', 'Dang YouTube': 'Rieng tu' }] }
});

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2,
  config: { name: 'Webhook nhap chu de', parameters: { httpMethod: 'POST', path: 'tao-video-khoa-hoc-net-ve', options: {} },
    output: [{ body: { chuDe: 'Vì sao ta ngáp lây?', thoiLuong: 2, giong: 'nam', youtube: 'private' } }] }
});

const normalize = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Chuan hoa dau vao', parameters: { jsCode: "// Gom dữ liệu từ Form, Webhook hoặc nút chạy thử về cùng một dạng.\n// Webhook: POST JSON {\"chuDe\": \"...\", \"thoiLuong\": 2, \"giong\": \"nam\"|\"nu\", \"youtube\": \"public\"|\"unlisted\"|\"private\"|\"khong\"}\nconst v = $json.body || $json;\nconst lay = (...ten) => { for (const t of ten) if (v[t] != null && v[t] !== '') return String(v[t]); return ''; };\nconst chuDe = lay('Chu de / cau hoi khoa hoc', 'chuDe', 'topic')\n  || 'Ngủ đủ 8 tiếng có thật sự là con số đúng cho mọi người?';   // chủ đề mẫu khi bấm chạy thử\nconst phut = Math.min(15, Math.max(1, parseFloat(lay('Thoi luong (phut)', 'thoiLuong')) || 2));\nconst thoiLuong = Math.round(phut * 60);\nconst nu = /n[uữ]/i.test(lay('Giong doc', 'giong')) && !/nam/i.test(lay('Giong doc', 'giong'));\nconst giong = nu ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';\nconst ytRaw = lay('Dang YouTube', 'youtube') || 'private';\nconst youtube = /khong dang|^khong$|none|^no$/i.test(ytRaw) ? 'khong'\n  : /unlisted|khong cong khai/i.test(ytRaw) ? 'unlisted'\n  : /public|cong khai/i.test(ytRaw) ? 'public' : 'private';\n// Mỗi cảnh khoảng 6 giây, giọng đọc khoảng 3 chữ/giây (180 chữ/phút).\nconst soCanh = Math.max(8, Math.min(120, Math.round(thoiLuong / 6)));\nconst soChu = Math.round(thoiLuong * 3);\nreturn [{ json: { chuDe, phut, thoiLuong, giong, youtube, soCanh, soChu, thoiGian: Date.now() } }];\n" },
    output: [{ chuDe: 'Vì sao ta ngáp lây?', phut: 2, thoiLuong: 120, giong: 'vi-VN-NamMinhNeural', youtube: 'private', soCanh: 20, soChu: 360, thoiGian: 1 }] }
});

const claudeModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3,
  config: { name: 'Claude Chat Model', parameters: {
    model: { __rl: true, mode: 'list', value: 'claude-sonnet-5-5', cachedResultName: 'Claude Sonnet 5.5' },
    options: { maxTokensToSample: 16000 } } }
});

const writer = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5,
  config: { name: 'AI viet kich ban', parameters: { promptType: 'define', text: expr("Bạn là biên kịch cho một kênh video giải thích khoa học đời thường bằng tranh vẽ người que đơn giản (tiếng Việt). Video ngang 16:9, ảnh tĩnh đổi mỗi 4-8 giây, có giọng đọc thân thiện và phụ đề chạy chữ.\n\nChủ đề hoặc câu hỏi: {{ $json.chuDe }}\nThời lượng: khoảng {{ $json.phut }} phút. Viết đúng khoảng {{ $json.soCanh }} cảnh, tổng lời đọc khoảng {{ $json.soChu }} chữ (không vượt quá). Mỗi cảnh 1-2 câu, 12-25 chữ.\n\nCấu trúc 6 nhịp:\n1. Hook (5%): câu hỏi hoặc khẳng định gây tò mò, đi ngược niềm tin phổ biến.\n2. Niềm tin phổ biến (10%): \"Ai cũng được dạy rằng...\".\n3. Cú lật (10%): \"Nhưng thực ra...\", kèm một con số hoặc sự thật bất ngờ.\n4. Giải thích (50%): 3-5 ý, mỗi ý gồm cơ chế, một ví von đời thường, và hệ quả.\n5. Áp dụng (15%): \"Vậy bạn nên...\" 2-3 việc cụ thể (chủ đề sức khỏe thì nhắc hỏi bác sĩ nếu kéo dài).\n6. Cảnh cuối: hỏi khán giả một câu dễ trả lời bằng 1 con số hoặc 1 từ, rồi mời bấm theo dõi.\nNếu video từ 8 phút trở lên: chia thành nhiều chương, mỗi chương mở bằng một câu hỏi con, vẫn theo tinh thần trên.\n\nGiọng văn: xưng \"bạn\", câu ngắn, từ ngữ đời thường, thuật ngữ phải giải thích ngay bằng ví von. Chuyển ý bằng \"Nhưng\", \"Thực ra\", \"Điều thú vị là\", \"Vậy thì\". Cứ 20-30 giây có một câu giữ chân người xem. Viết số và đơn vị theo cách đọc tự nhiên (viết \"phần trăm\", không dùng ký hiệu %).\nCHÍNH XÁC KHOA HỌC: chỉ đưa con số và khẳng định có cơ sở từ nguồn uy tín (WHO, NIH, đại học, tạp chí khoa học). Không bịa số liệu. Tiêu đề được gây tò mò nhưng nội dung phải trả lời trung thực.\n\nCho mỗi cảnh:\n- loi: lời đọc tiếng Việt.\n- anh: mô tả MỘT hình minh họa bằng tiếng Anh, vẽ được bằng người que và đồ vật đơn giản. Ưu tiên các thủ pháp: chia đôi khung trước/sau với mũi tên lớn, vòng tròn phóng to cơ chế bên trong, biểu đồ cột đơn giản, bong bóng suy nghĩ có dấu hỏi, vật biểu tượng phóng đại, hai nhân vật đối diện. KHÔNG mô tả chữ viết trong hình. Không tả ngoại hình nhân vật, chỉ gọi \"the scientist\" hoặc \"the person\".\n- nhanVat: \"host\" nếu có nhà khoa học linh vật, \"ban\" nếu có người xem bình thường, \"both\" nếu có cả hai, \"none\" nếu chỉ có đồ vật.\n- tieuDeCanh: tiêu đề IN HOA tiếng Việt tối đa 6 từ tóm ý chính của cảnh, hoặc \"\" nếu không cần. Khoảng một nửa số cảnh có tiêu đề.\n- banner: cụm 1-4 từ để nhấn mạnh một con số hoặc kết luận (ví dụ \"CHỈ 7 TIẾNG\"), hoặc \"\". Tối đa 1/5 số cảnh có banner.\n\nNgoài ra:\n- tieuDe: tiêu đề video tối đa 70 ký tự, dạng câu hỏi gây tò mò, kết thúc bằng ? hoặc !\n- moTa: mô tả 2-3 câu, có câu hỏi cho khán giả.\n- tags: 6-10 từ khóa tiếng Việt.\n- nguon: 2-4 nguồn tham khảo thật (tên tổ chức, bài báo hoặc sách) cho các con số đã dùng.\n\nChỉ trả về MỘT đối tượng JSON hợp lệ, không thêm lời giải thích, theo đúng cấu trúc:\n{\"tieuDe\": \"...\", \"moTa\": \"...\", \"tags\": [\"...\"], \"nguon\": [\"...\"], \"canh\": [{\"loi\": \"...\", \"anh\": \"...\", \"nhanVat\": \"host\", \"tieuDeCanh\": \"...\", \"banner\": \"\"}]}\n") },
    subnodes: { model: claudeModel },
    output: [{ text: '{"tieuDe":"Vì sao ta ngáp lây?","moTa":"...","tags":["khoa học"],"nguon":["NIH"],"canh":[{"loi":"...","anh":"...","nhanVat":"host","tieuDeCanh":"","banner":""}]}' }] }
});

const buildJson = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Dung JSON video', parameters: { jsCode: "// Ghép kịch bản AI thành JSON gửi JSON2Video, theo phong cách tranh nét vẽ giải thích khoa học.\nconst dv = $('Chuan hoa dau vao').item.json;\nconst layChu = v => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(layChu).join('')\n  : typeof v === 'object' ? layChu(v.text ?? v.content ?? v.output ?? v.message ?? '') : String(v);\nlet raw = layChu($json.text ?? $json.output ?? $json.response ?? $json.content).replace(/```(json)?/gi, '').trim();\nconst a = raw.indexOf('{'), b = raw.lastIndexOf('}');\nlet kb;\ntry { kb = JSON.parse(raw.slice(a, b + 1)); }\ncatch (e) { throw new Error('Không đọc được kịch bản AI trả về (JSON lỗi): ' + raw.slice(0, 400)); }\nconst canhAI = (kb.canh || []).filter(c => c && c.loi);\nif (!canhAI.length) throw new Error('Kịch bản AI không có cảnh nào: ' + raw.slice(0, 400));\n\n// ===== TÙY CHỈNH =====\n// Linh vật của kênh (bạn tự đặt, viết bằng tiếng Anh, giữ cố định để nhân vật giống nhau qua các cảnh).\nconst LINH_VAT = 'a round-headed stick-figure scientist with small round glasses, an orange safety helmet, a green scarf and a white lab coat, holding a pointer stick';\nconst NGUOI_XEM = 'a round-headed stick-figure person with a few messy hair strokes and a plain blue t-shirt';\n// Phong cách hình: hoạt hình giải thích nét mực dày, tô màu phẳng.\nconst PHONG_CACH = 'simple hand-drawn educational explainer cartoon, thick black ink outlines, flat colors, minimal shading, ' +\n  'round-headed stick figures with big expressive faces, clean pastel flat background, lots of empty space at the top and bottom, ' +\n  'whiteboard doodle style, slightly rough marker texture, no text, no letters, no words, no numbers, no watermark';\nconst MAU_DO = '#D7262B', MAU_XANH = '#3BAA3B';\nconst FONT = 'Be Vietnam Pro';\n// Nhạc nền: dán link trực tiếp tới file .mp3 nhạc nhẹ, vui, không lời mà bạn có quyền dùng. Để trống = không nhạc.\nconst NHAC_NEN = '';\nconst AM_LUONG_NHAC = 0.1;\n// =====================\n\nconst W = 1920, H = 1080;\nconst nhanVat = c => /host|linh/i.test(c.nhanVat || '') ? LINH_VAT + ', '\n  : /ban|you|viewer/i.test(c.nhanVat || '') ? NGUOI_XEM + ', '\n  : /both|ca hai/i.test(c.nhanVat || '') ? LINH_VAT + ' and ' + NGUOI_XEM + ', ' : '';\nconst sach = s => String(s || '').replace(/[<>]/g, '').trim();\n\nconst scenes = canhAI.map((c, i) => {\n  const elements = [{\n    type: 'image', model: 'flux-schnell',\n    prompt: nhanVat(c) + sach(c.anh || 'a curious stick figure looking at a big question mark') + ', ' + PHONG_CACH,\n    duration: -2, resize: 'cover', width: W, height: H, x: 0, y: 0, zoom: i % 2 ? -1 : 1,\n  }];\n  const tieuDe = sach(c.tieuDeCanh).toUpperCase();\n  if (tieuDe) elements.push({ type: 'text', style: '001', text: tieuDe, duration: -2,\n    x: 60, y: 40, width: W - 120, height: 170,\n    settings: { 'font-family': FONT, 'font-size': '84px', 'font-weight': '800', color: MAU_DO, 'text-align': 'center',\n                'text-shadow': '3px 3px 0 #FFFFFF, -3px -3px 0 #FFFFFF, 3px -3px 0 #FFFFFF, -3px 3px 0 #FFFFFF' } });\n  const banner = sach(c.banner).toUpperCase();\n  if (banner) elements.push({ type: 'text', style: '001', text: banner, duration: -2,\n    x: Math.round(W * 0.25), y: Math.round(H * 0.66), width: Math.round(W * 0.5), height: 130,\n    settings: { 'font-family': FONT, 'font-size': '72px', 'font-weight': '800', color: '#FFFFFF', 'text-align': 'center',\n                'background-color': MAU_DO, 'border': '6px solid #191919', 'padding': '10px 30px' } });\n  elements.push({ type: 'voice', text: sach(c.loi), voice: dv.giong, model: 'azure' });\n  return { 'background-color': '#F3E6CF', elements };   // cắt thẳng giữa các cảnh, không hiệu ứng chuyển\n});\n\nconst elements = [{ type: 'subtitles', language: 'vi', settings: {\n  style: 'classic', 'font-family': FONT, 'font-size': 64, 'word-color': MAU_XANH, 'line-color': '#FFFFFF',\n  'outline-color': '#000000', 'outline-width': 8, 'max-words-per-line': 3, position: 'bottom-center' } }];\nif (NHAC_NEN) elements.unshift({ type: 'audio', src: NHAC_NEN, volume: AM_LUONG_NHAC, duration: -2, loop: -1 });\nconst movie = { resolution: 'full-hd', quality: 'high', scenes, elements };\n\nconst tags = (Array.isArray(kb.tags) ? kb.tags : String(kb.tags || '').split(','))\n  .map(t => sach(t).replace(/#/g, '')).filter(Boolean).slice(0, 12);\nconst nguon = (Array.isArray(kb.nguon) ? kb.nguon : [kb.nguon]).map(sach).filter(Boolean);\nconst tieuDeYT = sach(kb.tieuDe || dv.chuDe).slice(0, 100);\nconst moTaYT = [\n  sach(kb.moTa),\n  '',\n  nguon.length ? 'Nguồn tham khảo:\\n' + nguon.map(n => '- ' + n).join('\\n') : '',\n  '',\n  'Video được tạo với sự hỗ trợ của AI.',\n  tags.map(t => '#' + t.replace(/\\s+/g, '')).join(' '),\n].join('\\n').slice(0, 4900);\nconst youtube = { tieuDe: tieuDeYT, moTa: moTaYT, tags: tags.join(',').slice(0, 450), cheDo: dv.youtube, danhMuc: '27' };  // 27 = Giáo dục\nreturn [{ json: { chuDe: dv.chuDe, tieuDe: tieuDeYT, kichBan: canhAI, youtube, movie } }];\n" },
    output: [{ chuDe: 'x', tieuDe: 'x', kichBan: [], youtube: { tieuDe: 'x', moTa: 'x', tags: 'a,b', cheDo: 'private', danhMuc: '27' }, movie: { scenes: [] } }] }
});

const submit = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Gui tao video (JSON2Video)', parameters: {
    method: 'POST', url: 'https://api.json2video.com/v2/movies', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.movie) }}'), options: {} },
    credentials: { httpHeaderAuth: { id: 'uljlXakbb6L267j7', name: 'Header Auth account' } },
    output: [{ success: true, project: 'abc123' }] }
});

const waitMin = node({
  type: 'n8n-nodes-base.wait', version: 1.1,
  config: { name: 'Doi 1 phut', parameters: { amount: 60 }, output: [{ success: true, project: 'abc123' }] }
});

const check = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Kiem tra video', parameters: {
    url: expr("https://api.json2video.com/v2/movies?project={{ $('Gui tao video (JSON2Video)').item.json.project }}"),
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: {} },
    credentials: { httpHeaderAuth: { id: 'uljlXakbb6L267j7', name: 'Header Auth account' } },
    output: [{ movie: { status: 'done', url: 'https://example.com/v.mp4', duration: 120, project: 'abc123' } }] }
});

const done = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Video da xong', parameters: { assignments: { assignments: [
    { id: 'a1', name: 'tieuDe', type: 'string', value: expr("{{ $('Dung JSON video').item.json.tieuDe }}") },
    { id: 'a2', name: 'videoUrl', type: 'string', value: expr('{{ $json.movie.url }}') },
    { id: 'a3', name: 'thoiLuongGiay', type: 'number', value: expr('{{ $json.movie.duration }}') },
    { id: 'a4', name: 'loiDocDayDu', type: 'string', value: expr("{{ $('Dung JSON video').item.json.kichBan.map(c => c.loi).join(' ') }}") }
  ] }, options: {} }, output: [{ tieuDe: 'x', videoUrl: 'https://example.com/v.mp4', thoiLuongGiay: 120, loiDocDayDu: 'x' }] }
});

const wantYT = ifElse({
  version: 2.2,
  config: { name: 'Co dang YouTube?', parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
    conditions: [{ leftValue: expr("{{ $('Dung JSON video').item.json.youtube.cheDo }}"), operator: { type: 'string', operation: 'notEquals' }, rightValue: 'khong' }],
    combinator: 'and' }, options: {} } }
});

const download = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Tai video ve', parameters: { url: expr('{{ $json.videoUrl }}'),
    options: { response: { response: { responseFormat: 'file' } }, timeout: 600000 } }, output: [{}] }
});

const upload = node({
  type: 'n8n-nodes-base.youTube', version: 1,
  config: { name: 'Dang len YouTube', parameters: {
    resource: 'video', operation: 'upload', title: expr("{{ $('Dung JSON video').item.json.youtube.tieuDe }}"), regionCode: 'VN',
    categoryId: expr("{{ $('Dung JSON video').item.json.youtube.danhMuc }}"),
    options: { description: expr("{{ $('Dung JSON video').item.json.youtube.moTa }}"), notifySubscribers: true,
      privacyStatus: expr("{{ $('Dung JSON video').item.json.youtube.cheDo }}"), selfDeclaredMadeForKids: false,
      tags: expr("{{ $('Dung JSON video').item.json.youtube.tags }}") } },
    credentials: { youTubeOAuth2Api: { id: 'DRwom5j5EQYKhSrW', name: 'YouTube account 2' } },
    output: [{ id: 'abc' }] }
});

const posted = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Da dang YouTube', parameters: { assignments: { assignments: [
    { id: 'd1', name: 'youtubeUrl', type: 'string', value: expr("{{ 'https://youtu.be/' + ($json.uploadId || $json.id) }}") },
    { id: 'd2', name: 'tieuDe', type: 'string', value: expr("{{ $('Dung JSON video').item.json.youtube.tieuDe }}") },
    { id: 'd3', name: 'videoUrl', type: 'string', value: expr("{{ $('Video da xong').item.json.videoUrl }}") }
  ] }, options: {} }, output: [{ youtubeUrl: 'https://youtu.be/abc', tieuDe: 'x', videoUrl: 'x' }] }
});

const fail = node({
  type: 'n8n-nodes-base.stopAndError', version: 1,
  config: { name: 'Bao loi', parameters: { errorMessage: expr("{{ 'JSON2Video báo lỗi: ' + ($json.movie.message || $json.movie.status) }}") } }
});

const limit = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Gioi han thoi gian cho', parameters: { jsCode: "// Mỗi vòng chờ 1 phút. Quá 40 vòng (khoảng 40 phút) mà video chưa xong thì dừng, tránh lặp mãi.\nif ($runIndex >= 40) throw new Error('JSON2Video làm video quá 40 phút chưa xong. Mã dự án: ' + ($json.movie?.project || '?'));\nreturn $input.all();\n" }, output: [{ movie: { status: 'running' } }] }
});

const status = switchCase({
  version: 3.2,
  config: { name: 'Xong chua?', parameters: {
    rules: { values: [
      { outputKey: 'Xong', renameOutput: true, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.movie.status }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'done' }], combinator: 'and' } },
      { outputKey: 'Loi', renameOutput: true, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.movie.status }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'error' },
          { leftValue: expr('{{ $json.movie.status }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'timeout' }
        ], combinator: 'or' } }
    ] },
    options: { fallbackOutput: 'extra', renameFallbackOutput: 'Dang lam' } } }
});

const note = sticky('## Video khoa học nét vẽ\n1. Nhập chủ đề ở Form (hoặc POST webhook `tao-video-khoa-hoc-net-ve`).\n2. Claude viết kịch bản 6 nhịp, mỗi cảnh 4-8 giây.\n3. JSON2Video vẽ tranh người que (flux-schnell), chèn tiêu đề đỏ/banner tiếng Việt, giọng Azure, phụ đề 3 chữ chữ đang đọc màu xanh lá.\n4. Chờ xong rồi đăng YouTube (mặc định Riêng tư).\n\nĐổi linh vật, màu, font, nhạc nền ở phần TÙY CHỈNH trong node **Dung JSON video**.', [], { color: 4 });

export default workflow('video-khoa-hoc-net-ve', 'Video khoa hoc net ve + dang YouTube')
  .add(manual).to(normalize)
  .add(form).to(normalize)
  .add(hook).to(normalize)
  .add(normalize).to(writer).to(buildJson).to(submit).to(waitMin).to(check)
  .to(status
    .onCase(0, done.to(wantYT.onTrue(download.to(upload).to(posted))))
    .onCase(1, fail)
    .onCase(2, limit))
  .add(limit).to(waitMin)
  .add(note)
  .group('Viet kich ban', [normalize, writer, claudeModel, buildJson], { description: 'Gom đầu vào, Claude viết kịch bản khoa học 6 nhịp, dựng JSON video tranh nét vẽ' })
  .group('Dang YouTube', [done, wantYT, download, upload, posted], { description: 'Tải video đã xong về và đăng YouTube theo chế độ đã chọn' });
