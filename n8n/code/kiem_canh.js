// Kiểm tra mọi clip cảnh đã dựng xong chưa. Còn đang làm -> quay lại chờ. Xong hết -> chuyển sang ghép.
if ($runIndex >= 60) throw new Error('Dựng clip quá lâu (hơn khoảng 20 phút), dừng để tránh lặp mãi.');
const ds = $input.all().map((it, i) => { const j = it.json.result ?? it.json.data ?? it.json; return { i, id: j.id, status: j.status, out: j.outputUrl ?? j.output_url, loi: j.error ?? j.error_category }; });
const hong = ds.filter(d => /fail|cancel/i.test(d.status || ''));
if (hong.length) throw new Error('FFmpeg Micro báo lỗi ở ' + hong.length + ' clip: ' + JSON.stringify(hong).slice(0, 500));
if (ds.some(d => d.status !== 'completed')) return ds.map(d => ({ json: { route: 'cho', id: d.id } }));
return [{ json: { route: 'xong', urls: ds.map(d => d.out) } }];
