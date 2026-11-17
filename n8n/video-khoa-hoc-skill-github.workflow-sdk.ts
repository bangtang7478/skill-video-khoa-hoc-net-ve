import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, languageModel, expr } from '@n8n/workflow-sdk';

const manual = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Bam de chay thu' } });

const form = trigger({
  type: 'n8n-nodes-base.formTrigger', version: 2.2,
  config: { name: 'Form nhap chu de', parameters: {
    formTitle: 'Video khoa học nét vẽ (chạy theo bộ skill GitHub)',
    formDescription: 'Nhập chủ đề khoa học. Workflow tải bộ skill mới nhất từ GitHub, Claude viết kịch bản theo skill, inference.sh vẽ tranh và đọc giọng, FFmpeg Micro dựng video, rồi đăng YouTube nếu bạn chọn.',
    formFields: { values: [
      { fieldLabel: 'Chu de / cau hoi khoa hoc', placeholder: 'Ví dụ: Vì sao ta ngáp lây?', requiredField: true },
      { fieldLabel: 'Thoi luong (phut)', fieldType: 'dropdown', fieldOptions: { values: [{ option: '1' }, { option: '2' }, { option: '3' }, { option: '5' }] }, requiredField: true },
      { fieldLabel: 'Giong doc', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Nam' }, { option: 'Nu' }] }, requiredField: true },
      { fieldLabel: 'Dang YouTube', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Rieng tu' }, { option: 'Khong cong khai (ai co link moi xem)' }, { option: 'Cong khai' }, { option: 'Khong dang' }] }, requiredField: true }
    ] },
    options: { respondWithOptions: { values: { formSubmittedText: 'Đã nhận! Video đang được làm, khoảng 10-20 phút sẽ xong.' } } }
  },
  output: [{ 'Chu de / cau hoi khoa hoc': 'Vì sao ta ngáp lây?', 'Thoi luong (phut)': '1', 'Giong doc': 'Nam', 'Dang YouTube': 'Rieng tu' }] }
});

const hook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2,
  config: { name: 'Webhook nhap chu de', parameters: { httpMethod: 'POST', path: 'video-khoa-hoc-skill-github', options: {} },
    output: [{ body: { chuDe: 'Vì sao ta ngáp lây?', thoiLuong: 1, giong: 'nam', youtube: 'khong' } }] }
});

const normalize = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Chuan hoa dau vao', parameters: { jsCode: "// Gom dữ liệu từ Form, Webhook hoặc nút chạy thử về cùng một dạng.\n// Webhook: POST JSON {\"chuDe\": \"...\", \"thoiLuong\": 2, \"giong\": \"nam\"|\"nu\", \"youtube\": \"public\"|\"unlisted\"|\"private\"|\"khong\"}\nconst v = $json.body || $json;\nconst lay = (...ten) => { for (const t of ten) if (v[t] != null && v[t] !== '') return String(v[t]); return ''; };\nconst chuDe = lay('Chu de / cau hoi khoa hoc', 'chuDe', 'topic')\n  || 'Ngủ đủ 8 tiếng có thật sự là con số đúng cho mọi người?';   // chủ đề mẫu khi bấm chạy thử\nconst phut = Math.min(10, Math.max(1, parseFloat(lay('Thoi luong (phut)', 'thoiLuong')) || 2));\nconst thoiLuong = Math.round(phut * 60);\nconst g = lay('Giong doc', 'giong');\nconst nu = /n[uữ]/i.test(g) && !/nam/i.test(g);\n// Giọng ElevenLabs (đa ngôn ngữ, đọc được tiếng Việt). Đổi sang voice_id riêng ở node \"Doc giong\" nếu muốn.\nconst giong = nu ? 'alice' : 'george';\nconst ytRaw = lay('Dang YouTube', 'youtube') || 'private';\nconst youtube = /khong dang|^khong$|none|^no$/i.test(ytRaw) ? 'khong'\n  : /unlisted|khong cong khai/i.test(ytRaw) ? 'unlisted'\n  : /public|cong khai/i.test(ytRaw) ? 'public' : 'private';\nconst soCanh = Math.max(6, Math.min(60, Math.round(thoiLuong / 6)));   // mỗi cảnh khoảng 6 giây (theo skill kich-ban)\nconst soChu = Math.round(thoiLuong * 3);                             // khoảng 180 chữ/phút\nreturn [{ json: { chuDe, phut, thoiLuong, giong, youtube, soCanh, soChu } }];\n" },
    output: [{ chuDe: 'Vì sao ta ngáp lây?', phut: 1, thoiLuong: 60, giong: 'george', youtube: 'khong', soCanh: 10, soChu: 180 }] }
});

const laySkill = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Lay skill tu GitHub', parameters: { jsCode: "// Tải bộ skill mới nhất từ GitHub. Sửa skill trên GitHub là workflow tự dùng bản mới ở lần chạy sau.\nconst REPO = 'https://raw.githubusercontent.com/bangtang7478/skill-video-khoa-hoc-net-ve/main/skills/';\nconst can = {\n  tongQuat: 'video-khoa-hoc-net-ve/SKILL.md',\n  kichBan: 'kich-ban-khoa-hoc-de-hieu/SKILL.md',\n  veTranh: 've-tranh-khoa-hoc-net-don-gian/SKILL.md',\n  giongDoc: 'giong-doc-phu-de-karaoke/SKILL.md',\n};\nconst skills = {};\nfor (const [k, f] of Object.entries(can)) {\n  const t = await this.helpers.httpRequest({ method: 'GET', url: REPO + f, json: false, encoding: 'text' });\n  skills[k] = String(t).replace(/^---[\\s\\S]*?---\\s*/, '');   // bỏ phần frontmatter\n}\n// Lấy khối STYLE (code block đầu tiên trong mục \"Khóa phong cách\") của skill vẽ tranh.\nconst m = skills.veTranh.match(/Khóa phong cách[\\s\\S]*?```\\s*\\n([\\s\\S]*?)```/i);\nconst style = (m ? m[1] : '').replace(/\\s+/g, ' ').replace(/^,\\s*/, '').trim()\n  || 'simple hand-drawn educational cartoon, thick black ink outlines, flat colors, round-headed stick-figure characters';\nreturn [{ json: { ...$json, skills, style } }];\n" },
    output: [{ chuDe: 'x', phut: 1, soCanh: 10, soChu: 180, giong: 'george', youtube: 'khong', skills: { tongQuat: 'x', kichBan: 'x', veTranh: 'x', giongDoc: 'x' }, style: 'x' }] }
});

const claudeModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', version: 1.3,
  config: { name: 'Claude Chat Model', parameters: {
    model: { __rl: true, mode: 'list', value: 'claude-sonnet-5-5', cachedResultName: 'Claude Sonnet 5.5' },
    options: { maxTokensToSample: 16000 } } }
});

const writer = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5,
  config: { name: 'Claude viet kich ban theo skill', parameters: { promptType: 'define', text: expr("Bạn là biên kịch kiêm họa sĩ phân cảnh của một kênh video giải thích khoa học bằng tranh nét vẽ. Hãy LÀM ĐÚNG THEO bộ skill của kênh dưới đây (đây là quy trình chuẩn của kênh, ưu tiên cao nhất).\n\n===== SKILL TỔNG QUÁT =====\n{{ $json.skills.tongQuat }}\n\n===== SKILL VIẾT KỊCH BẢN =====\n{{ $json.skills.kichBan }}\n\n===== SKILL VẼ TRANH =====\n{{ $json.skills.veTranh }}\n\n===== SKILL GIỌNG ĐỌC =====\n{{ $json.skills.giongDoc }}\n\n===== NHIỆM VỤ =====\nChủ đề hoặc câu hỏi: {{ $json.chuDe }}\nThời lượng: khoảng {{ $json.phut }} phút, khoảng {{ $json.soCanh }} cảnh, tổng lời đọc khoảng {{ $json.soChu }} chữ.\nLàm gộp các bước: chọn tiêu đề và góc nhìn (bước 1), viết kịch bản 6 nhịp và chia cảnh (bước 2), viết prompt ảnh cho từng cảnh (bước 3), chuẩn hóa lời đọc cho máy đọc (bước 4). Bỏ qua các bước cần người duyệt vì đây là chạy tự động.\nVới mỗi cảnh, trường \"anh_en\" là prompt ảnh tiếng Anh theo mục \"Prompt mỗi cảnh\" của skill vẽ tranh: bố cục/thủ pháp + nhân vật + hành động + vật/ẩn dụ, và nếu cảnh có chữ thì ghi rõ chữ tiếng Việt cần vẽ đúng như mẫu trong skill (tiêu đề đỏ ở trên, banner đỏ chữ trắng, nhãn). KHÔNG chép khối STYLE vào (hệ thống tự thêm). Nhân vật linh vật gọi là \"the host scientist\", người xem gọi là \"the viewer\".\n\"tts\" là lời đọc đã chuẩn hóa theo mục 2 của skill giọng đọc (số và ký hiệu viết thành chữ).\n\nChỉ trả về MỘT đối tượng JSON hợp lệ, không thêm chữ nào khác:\n{\"tieuDe\": \"...\", \"moTa\": \"...\", \"tags\": [\"...\"], \"nguon\": [\"...\"], \"canh\": [{\"id\": \"001\", \"loi\": \"lời đọc hiển thị\", \"tts\": \"lời đọc cho máy\", \"anh_en\": \"...\", \"nhanVat\": \"host|viewer|both|none\"}]}\n") },
    subnodes: { model: claudeModel },
    output: [{ text: '{"tieuDe":"x","moTa":"x","tags":["a"],"nguon":["b"],"canh":[{"id":"001","loi":"x","tts":"x","anh_en":"x","nhanVat":"host"}]}' }] }
});

const tachCanh = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Tach canh', parameters: { jsCode: "// Đọc JSON kịch bản Claude trả về, tách mỗi cảnh thành một item và ghép prompt ảnh theo skill vẽ tranh.\nconst dv = $('Lay skill tu GitHub').first().json;\nconst layChu = v => v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(layChu).join('')\n  : typeof v === 'object' ? layChu(v.text ?? v.content ?? v.output ?? '') : String(v);\nconst raw = layChu($json.text ?? $json.output ?? $json.response).replace(/```(json)?/gi, '').trim();\nlet kb;\ntry { kb = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); }\ncatch (e) { throw new Error('Kịch bản AI không phải JSON hợp lệ: ' + raw.slice(0, 300)); }\nconst canh = (kb.canh || []).filter(c => c && c.loi);\nif (!canh.length) throw new Error('Kịch bản không có cảnh nào');\n\n// ===== TÙY CHỈNH: linh vật riêng của kênh (tiếng Anh, giữ cố định) =====\nconst HOST = 'the host scientist: a round-headed stick-figure scientist with small round glasses, an orange safety helmet, a green scarf and a white lab coat, holding a pointer stick';\nconst VIEWER = 'the viewer: a round-headed stick-figure person with a few messy hair strokes and a plain blue t-shirt';\n// ======================================================================\nconst nv = k => /both/i.test(k) ? HOST + '; ' + VIEWER + '. ' : /host/i.test(k) ? HOST + '. ' : /viewer|ban/i.test(k) ? VIEWER + '. ' : '';\nconst sach = s => String(s || '').replace(/[<>]/g, '').trim();\nconst tags = (Array.isArray(kb.tags) ? kb.tags : String(kb.tags || '').split(',')).map(t => sach(t).replace(/#/g, '')).filter(Boolean).slice(0, 12);\nconst nguon = (Array.isArray(kb.nguon) ? kb.nguon : [kb.nguon]).map(sach).filter(Boolean);\nconst tieuDe = sach(kb.tieuDe || dv.chuDe).slice(0, 100);\nconst youtube = {\n  tieuDe, cheDo: dv.youtube, danhMuc: '27', tags: tags.join(',').slice(0, 450),\n  moTa: [sach(kb.moTa), '', nguon.length ? 'Nguồn tham khảo:\\n' + nguon.map(n => '- ' + n).join('\\n') : '', '',\n         'Video được tạo với sự hỗ trợ của AI.', tags.map(t => '#' + t.replace(/\\s+/g, '')).join(' ')].join('\\n').slice(0, 4900),\n};\nreturn canh.map((c, i) => ({ json: {\n  stt: i, id: String(i + 1).padStart(3, '0'), tongCanh: canh.length,\n  loi: sach(c.loi), tts: sach(c.tts || c.loi), giong: dv.giong,\n  promptAnh: nv(c.nhanVat || '') + sach(c.anh_en) + ', ' + dv.style + ', no watermark',\n  youtube,\n} }));\n" },
    output: [{ stt: 0, id: '001', tongCanh: 1, loi: 'x', tts: 'x', giong: 'george', promptAnh: 'x', youtube: { tieuDe: 'x', moTa: 'x', tags: 'a', cheDo: 'khong', danhMuc: '27' } }] }
});

const veAnh = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Ve anh', parameters: {
    method: 'POST', url: 'https://api.inference.sh/run', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
    sendBody: true, specifyBody: 'json',
    jsonBody: expr('{{ JSON.stringify({ app: "google/gemini-3-1-flash-image", input: { prompt: $json.promptAnh, aspect_ratio: "16:9", resolution: "1K" }, wait: true }) }}'),
    options: { timeout: 300000, batching: { batch: { batchSize: 3, batchInterval: 1000 } } } },
    credentials: { httpTemplatedCustomAuth: newCredential('inference.sh API key') },
    output: [{ id: 'task_1', status: 10, output: { images: [{ uri: 'https://example.com/a.png' }] } }] }
});

const docGiong = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Doc giong', parameters: {
    method: 'POST', url: 'https://api.inference.sh/run', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
    sendBody: true, specifyBody: 'json',
    jsonBody: expr("{{ JSON.stringify({ app: 'elevenlabs/eleven-v4', input: { text: $('Tach canh').item.json.tts, voice: $('Tach canh').item.json.giong }, wait: true }) }}"),
    options: { timeout: 300000, batching: { batch: { batchSize: 3, batchInterval: 1000 } } } },
    credentials: { httpTemplatedCustomAuth: newCredential('inference.sh API key') },
    output: [{ id: 'task_2', status: 10, output: { audio: 'https://example.com/a.mp3' } }] }
});

const gomCanh = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Gom anh va giong', parameters: { jsCode: "// Gom URL ảnh + giọng của từng cảnh, tạo yêu cầu dựng 1 clip/cảnh cho FFmpeg Micro.\n// ===== TÙY CHỈNH =====\nconst PHU_DE = true;            // hiện lời đọc ở dưới khung (FFmpeg Micro không làm được karaoke từng chữ)\nconst MAU_NEN = '0xF3E6CF';\n// =====================\nconst canh = $('Tach canh').all();\nconst anh = $('Ve anh').all();\n// Tìm URL file trong kết quả inference.sh (output.images[0].uri, output.audio, ... tùy app).\nconst timUrl = o => {\n  if (!o) return null;\n  if (typeof o === 'string') return /^(https?|inf):/.test(o) ? o : null;\n  if (Array.isArray(o)) { for (const x of o) { const u = timUrl(x); if (u) return u; } return null; }\n  if (typeof o === 'object') { for (const k of ['output', 'images', 'image', 'audio', 'uri', 'url']) { if (k in o) { const u = timUrl(o[k]); if (u) return u; } } }\n  return null;\n};\nreturn $input.all().map((giongItem, i) => {\n  const c = canh[i].json;\n  const urlAnh = timUrl(anh[i].json.data ?? anh[i].json);\n  const urlGiong = timUrl(giongItem.json.data ?? giongItem.json);\n  if (!urlAnh) throw new Error('Cảnh ' + c.id + ': không thấy URL ảnh trong kết quả inference.sh: ' + JSON.stringify(anh[i].json).slice(0, 300));\n  if (!urlGiong) throw new Error('Cảnh ' + c.id + ': không thấy URL giọng trong kết quả inference.sh: ' + JSON.stringify(giongItem.json).slice(0, 300));\n  const zoom = '';\n  const options = [\n    { option: '-vf', argument: 'loop=loop=-1:size=1:start=0,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=' + MAU_NEN + ',fps=30,format=yuv420p' + zoom },\n    { option: '-c:v', argument: 'libx264' },\n    { option: '-preset', argument: 'veryfast' },\n    { option: '-c:a', argument: 'aac' },\n    { option: '-b:a', argument: '192k' },\n    { option: '-shortest', argument: '' },\n  ];\n  if (PHU_DE) options.push({ option: '@text-overlay', argument: { text: c.loi,\n    style: { position: 'bottom-center', fontSize: 46, fontColor: 'white', outlineThickness: 4, charsPerLine: 48, margin: 40 } } });\n  return { json: { stt: c.stt, id: c.id, urlAnh, urlGiong,\n    body: { inputs: [{ url: urlAnh }, { url: urlGiong }], outputFormat: 'mp4', options } } };\n});\n" },
    output: [{ stt: 0, id: '001', urlAnh: 'x', urlGiong: 'x', body: { inputs: [], outputFormat: 'mp4', options: [] } }] }
});

const dungCanh = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Dung clip tung canh', parameters: {
    method: 'POST', url: 'https://api.ffmpeg-micro.com/v1/transcodes', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
    sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'),
    options: { batching: { batch: { batchSize: 5, batchInterval: 500 } } } },
    credentials: { httpTemplatedCustomAuth: newCredential('FFmpeg Micro API key') },
    output: [{ id: 'job_1', status: 'pending' }] }
});

const doiCanh = node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { name: 'Doi dung clip', parameters: { amount: 20 }, output: [{ id: 'job_1' }] } });

const kiemCanh = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Kiem tra clip', parameters: {
    url: expr('https://api.ffmpeg-micro.com/v1/transcodes/{{ $json.id ?? $json.result?.id ?? $json.data?.id }}'),
    authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth', options: {} },
    credentials: { httpTemplatedCustomAuth: newCredential('FFmpeg Micro API key') },
    output: [{ id: 'job_1', status: 'completed', outputUrl: 'gs://b/c.mp4' }] }
});

const canhXong = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Clip xong het chua?', parameters: { jsCode: "// Kiểm tra mọi clip cảnh đã dựng xong chưa. Còn đang làm -> quay lại chờ. Xong hết -> chuyển sang ghép.\nif ($runIndex >= 60) throw new Error('Dựng clip quá lâu (hơn khoảng 20 phút), dừng để tránh lặp mãi.');\nconst ds = $input.all().map((it, i) => { const j = it.json.result ?? it.json.data ?? it.json; return { i, id: j.id, status: j.status, out: j.outputUrl ?? j.output_url, loi: j.error ?? j.error_category }; });\nconst hong = ds.filter(d => /fail|cancel/i.test(d.status || ''));\nif (hong.length) throw new Error('FFmpeg Micro báo lỗi ở ' + hong.length + ' clip: ' + JSON.stringify(hong).slice(0, 500));\nif (ds.some(d => d.status !== 'completed')) return ds.map(d => ({ json: { route: 'cho', id: d.id } }));\nreturn [{ json: { route: 'xong', urls: ds.map(d => d.out) } }];\n" }, output: [{ route: 'xong', urls: ['gs://b/c.mp4'] }] }
});

const routeCanh = ifElse({
  version: 2.2,
  config: { name: 'Con clip dang dung?', parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
    conditions: [{ leftValue: expr('{{ $json.route }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'cho' }],
    combinator: 'and' }, options: {} } }
});

const chiaNhom = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Chia nhom ghep', parameters: { jsCode: "// Ghép các clip theo nhóm tối đa 10 (giới hạn của FFmpeg Micro). Nhiều nhóm thì vòng sau ghép tiếp các nhóm.\nconst urls = $json.urls || [];\nconst nhom = [];\nfor (let i = 0; i < urls.length; i += 10) nhom.push(urls.slice(i, i + 10));\nreturn nhom.map((g, k) => ({ json: { nhom: k, body: { inputs: g.map(url => ({ url })), outputFormat: 'mp4', preset: { quality: 'high', resolution: '1080p' } } } }));\n" }, output: [{ nhom: 0, body: { inputs: [], outputFormat: 'mp4' } }] }
});

const ghep = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Ghep clip', parameters: {
    method: 'POST', url: 'https://api.ffmpeg-micro.com/v1/transcodes', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
    sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.body) }}'), options: {} },
    credentials: { httpTemplatedCustomAuth: newCredential('FFmpeg Micro API key') },
    output: [{ id: 'job_9', status: 'pending' }] }
});

const doiGhep = node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { name: 'Doi ghep', parameters: { amount: 20 }, output: [{ id: 'job_9' }] } });

const kiemGhep = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Kiem tra ghep', parameters: {
    url: expr('https://api.ffmpeg-micro.com/v1/transcodes/{{ $json.id ?? $json.result?.id ?? $json.data?.id }}'),
    authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth', options: {} },
    credentials: { httpTemplatedCustomAuth: newCredential('FFmpeg Micro API key') },
    output: [{ id: 'job_9', status: 'completed', outputUrl: 'gs://b/full.mp4' }] }
});

const ghepXong = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Ghep xong chua?', parameters: { jsCode: "// Kiểm tra các lần ghép. Còn làm -> chờ tiếp. Xong mà còn nhiều đoạn -> ghép tiếp. Còn 1 đoạn -> video hoàn chỉnh.\nif ($runIndex >= 60) throw new Error('Ghép video quá lâu, dừng để tránh lặp mãi.');\nconst ds = $input.all().map(it => { const j = it.json.result ?? it.json.data ?? it.json; return { id: j.id, status: j.status, out: j.outputUrl ?? j.output_url }; });\nconst hong = ds.filter(d => /fail|cancel/i.test(d.status || ''));\nif (hong.length) throw new Error('FFmpeg Micro báo lỗi khi ghép: ' + JSON.stringify(hong).slice(0, 500));\nif (ds.some(d => d.status !== 'completed')) return ds.map(d => ({ json: { route: 'cho', id: d.id } }));\nif (ds.length > 1) return [{ json: { route: 'tiep', urls: ds.map(d => d.out) } }];\nreturn [{ json: { route: 'het', id: ds[0].id } }];\n" }, output: [{ route: 'het', id: 'job_9' }] }
});

const routeGhep = switchCase({
  version: 3.2,
  config: { name: 'Buoc tiep theo', parameters: {
    rules: { values: [
      { outputKey: 'Dang ghep', renameOutput: true, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.route }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'cho' }], combinator: 'and' } },
      { outputKey: 'Ghep tiep', renameOutput: true, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.route }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'tiep' }], combinator: 'and' } },
      { outputKey: 'Hoan thanh', renameOutput: true, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.route }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'het' }], combinator: 'and' } }
    ] }, options: {} } }
});

const layLink = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Lay link tai video', parameters: {
    url: expr('https://api.ffmpeg-micro.com/v1/transcodes/{{ $json.id }}/download'),
    authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth', options: {} },
    credentials: { httpTemplatedCustomAuth: newCredential('FFmpeg Micro API key') },
    output: [{ url: 'https://storage.googleapis.com/x.mp4' }] }
});

const ketQua = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Video da xong', parameters: { assignments: { assignments: [
    { id: 'k1', name: 'videoUrl', type: 'string', value: expr('{{ $json.url ?? $json.result?.url ?? $json.data?.url }}') },
    { id: 'k2', name: 'tieuDe', type: 'string', value: expr("{{ $('Tach canh').first().json.youtube.tieuDe }}") },
    { id: 'k3', name: 'ghiChu', type: 'string', value: 'Link tải hết hạn sau 10 phút; tải về hoặc đăng YouTube ngay.' }
  ] }, options: {} }, output: [{ videoUrl: 'https://storage.googleapis.com/x.mp4', tieuDe: 'x', ghiChu: 'x' }] }
});

const wantYT = ifElse({
  version: 2.2,
  config: { name: 'Co dang YouTube?', parameters: { conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
    conditions: [{ leftValue: expr("{{ $('Tach canh').first().json.youtube.cheDo }}"), operator: { type: 'string', operation: 'notEquals' }, rightValue: 'khong' }],
    combinator: 'and' }, options: {} } }
});

const taiVideo = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: { name: 'Tai video ve', parameters: { url: expr('{{ $json.videoUrl }}'),
    options: { response: { response: { responseFormat: 'file' } }, timeout: 600000 } }, output: [{}] }
});

const upload = node({
  type: 'n8n-nodes-base.youTube', version: 1,
  config: { name: 'Dang len YouTube', parameters: {
    resource: 'video', operation: 'upload', title: expr("{{ $('Tach canh').first().json.youtube.tieuDe }}"), regionCode: 'VN',
    categoryId: '27',
    options: { description: expr("{{ $('Tach canh').first().json.youtube.moTa }}"), notifySubscribers: true,
      privacyStatus: expr("{{ $('Tach canh').first().json.youtube.cheDo }}"), selfDeclaredMadeForKids: false,
      tags: expr("{{ $('Tach canh').first().json.youtube.tags }}") } },
    credentials: { youTubeOAuth2Api: { id: 'DRwom5j5EQYKhSrW', name: 'YouTube account 2' } },
    output: [{ id: 'abc' }] }
});

const note = sticky('## Chạy bằng bộ skill trên GitHub\nMỗi lần chạy, node **Lay skill tu GitHub** tải SKILL.md mới nhất từ repo `bangtang7478/skill-video-khoa-hoc-net-ve`; Claude viết kịch bản đúng theo skill, khối STYLE lấy từ skill vẽ tranh.\n\n**Cần điền 2 credential** (kiểu Custom Auth, header `Authorization: Bearer <key>`):\n- `inference.sh API key` (key bắt đầu bằng inf_)\n- `FFmpeg Micro API key`\n\nGiới hạn: FFmpeg Micro không cho filter_complex nên phụ đề hiện cả câu (không karaoke từng chữ).', [], { color: 4 });

export default workflow('video-khoa-hoc-skill-github', 'Video khoa hoc net ve (skill GitHub, khong JSON2Video)')
  .add(manual).to(normalize)
  .add(form).to(normalize)
  .add(hook).to(normalize)
  .add(normalize).to(laySkill).to(writer).to(tachCanh).to(veAnh).to(docGiong).to(gomCanh).to(dungCanh).to(doiCanh).to(kiemCanh).to(canhXong)
  .to(routeCanh.onTrue(doiCanh).onFalse(chiaNhom))
  .add(chiaNhom).to(ghep).to(doiGhep).to(kiemGhep).to(ghepXong)
  .to(routeGhep
    .onCase(0, doiGhep)
    .onCase(1, chiaNhom)
    .onCase(2, layLink.to(ketQua).to(wantYT.onTrue(taiVideo.to(upload)))))
  .add(note)
  .group('Skill va kich ban', [normalize, laySkill, writer, claudeModel, tachCanh], { description: 'Tải SKILL.md từ GitHub, Claude viết kịch bản và prompt ảnh theo skill, tách từng cảnh' })
  .group('Anh va giong', [veAnh, docGiong, gomCanh], { description: 'inference.sh vẽ tranh (Nano Banana 2) và đọc giọng (ElevenLabs) cho từng cảnh' })
  .group('Dang YouTube', [layLink, ketQua, wantYT, taiVideo, upload], { description: 'Lấy link video hoàn chỉnh, tải về và đăng YouTube theo chế độ đã chọn' });
