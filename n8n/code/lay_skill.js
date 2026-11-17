// Tải bộ skill mới nhất từ GitHub. Sửa skill trên GitHub là workflow tự dùng bản mới ở lần chạy sau.
const REPO = 'https://raw.githubusercontent.com/bangtang7478/skill-video-khoa-hoc-net-ve/main/skills/';
const can = {
  tongQuat: 'video-khoa-hoc-net-ve/SKILL.md',
  kichBan: 'kich-ban-khoa-hoc-de-hieu/SKILL.md',
  veTranh: 've-tranh-khoa-hoc-net-don-gian/SKILL.md',
  giongDoc: 'giong-doc-phu-de-karaoke/SKILL.md',
};
const skills = {};
for (const [k, f] of Object.entries(can)) {
  const t = await this.helpers.httpRequest({ method: 'GET', url: REPO + f, json: false, encoding: 'text' });
  skills[k] = String(t).replace(/^---[\s\S]*?---\s*/, '');   // bỏ phần frontmatter
}
// Lấy khối STYLE (code block đầu tiên trong mục "Khóa phong cách") của skill vẽ tranh.
const m = skills.veTranh.match(/Khóa phong cách[\s\S]*?```\s*\n([\s\S]*?)```/i);
const style = (m ? m[1] : '').replace(/\s+/g, ' ').replace(/^,\s*/, '').trim()
  || 'simple hand-drawn educational cartoon, thick black ink outlines, flat colors, round-headed stick-figure characters';
return [{ json: { ...$json, skills, style } }];
