// Ghép các clip theo nhóm tối đa 10 (giới hạn của FFmpeg Micro). Nhiều nhóm thì vòng sau ghép tiếp các nhóm.
const urls = $json.urls || [];
const nhom = [];
for (let i = 0; i < urls.length; i += 10) nhom.push(urls.slice(i, i + 10));
return nhom.map((g, k) => ({ json: { nhom: k, body: { inputs: g.map(url => ({ url })), outputFormat: 'mp4', preset: { quality: 'high', resolution: '1080p' } } } }));
