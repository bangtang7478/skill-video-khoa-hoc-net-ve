// Kiểm tra các lần ghép. Còn làm -> chờ tiếp. Xong mà còn nhiều đoạn -> ghép tiếp. Còn 1 đoạn -> video hoàn chỉnh.
if ($runIndex >= 60) throw new Error('Ghép video quá lâu, dừng để tránh lặp mãi.');
const ds = $input.all().map(it => { const j = it.json.result ?? it.json.data ?? it.json; return { id: j.id, status: j.status, out: j.outputUrl ?? j.output_url }; });
const hong = ds.filter(d => /fail|cancel/i.test(d.status || ''));
if (hong.length) throw new Error('FFmpeg Micro báo lỗi khi ghép: ' + JSON.stringify(hong).slice(0, 500));
if (ds.some(d => d.status !== 'completed')) return ds.map(d => ({ json: { route: 'cho', id: d.id } }));
if (ds.length > 1) return [{ json: { route: 'tiep', urls: ds.map(d => d.out) } }];
return [{ json: { route: 'het', id: ds[0].id } }];
