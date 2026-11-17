# Bộ skill làm video giải thích khoa học bằng tranh nét vẽ

Bộ skill cho Claude để làm video **giải thích khoa học đời thường** theo phong cách: tranh hoạt hình nét mực dày,
người que đầu tròn, chữ tiếng Việt in hoa trong tranh, giọng đọc tiếng Việt + phụ đề karaoke, khung 16:9,
bản ngắn ~2 phút hoặc bản dài 10–16 phút.

Phong cách được tổng hợp từ việc xem công khai các video thành công cùng thể loại; xem
[phan-tich-phong-cach.md](skills/video-khoa-hoc-net-ve/references/phan-tich-phong-cach.md). Bộ skill chỉ dạy **phong cách và quy trình**;
hãy tự tạo linh vật, tên kênh và nội dung riêng.

## Các skill
| Skill | Việc |
|---|---|
| [video-khoa-hoc-net-ve](skills/video-khoa-hoc-net-ve/SKILL.md) | Điều phối cả quy trình từ chủ đề đến video |
| [chu-de-tieu-de-khoa-hoc](skills/chu-de-tieu-de-khoa-hoc/SKILL.md) | Chọn chủ đề, góc nhìn, tiêu đề, hook |
| [kich-ban-khoa-hoc-de-hieu](skills/kich-ban-khoa-hoc-de-hieu/SKILL.md) | Viết kịch bản 6 nhịp, chia cảnh `scenes.json` |
| [ve-tranh-khoa-hoc-net-don-gian](skills/ve-tranh-khoa-hoc-net-don-gian/SKILL.md) | Linh vật, prompt ảnh, chèn chữ tiếng Việt, thumbnail |
| [giong-doc-phu-de-karaoke](skills/giong-doc-phu-de-karaoke/SKILL.md) | Giọng đọc TTS + phụ đề karaoke `.ass` |
| [dung-video-khoa-hoc](skills/dung-video-khoa-hoc/SKILL.md) | Dựng ffmpeg, nhạc, kiểm tra, nội dung đăng bài |

Script kèm theo:
- `skills/ve-tranh-khoa-hoc-net-don-gian/scripts/them_chu.py`: chèn tiêu đề/banner/nhãn tiếng Việt lên ảnh.
- `skills/giong-doc-phu-de-karaoke/scripts/phu_de_karaoke.py`: tạo phụ đề karaoke từ kịch bản + audio.
- `skills/dung-video-khoa-hoc/scripts/build_video.py`: ghép ảnh + giọng + phụ đề + nhạc thành video.

## Chạy trên n8n
Thư mục [n8n/](n8n/README.md) có workflow chạy trên n8n Cloud: tải bộ skill này từ GitHub, Claude viết kịch bản theo skill, inference.sh vẽ tranh và đọc giọng, FFmpeg Micro dựng video, rồi đăng YouTube. Không dùng JSON2Video.

## Cài đặt (Claude Code / claude.ai)
**Claude Code**: chép các thư mục trong `skills/` vào `~/.claude/skills/` (hoặc `.claude/skills/` của dự án):
```bash
git clone https://github.com/bangtang7478/skill-video-khoa-hoc-net-ve
cp -r skill-video-khoa-hoc-net-ve/skills/* ~/.claude/skills/
```

**claude.ai**: nén từng thư mục skill thành .zip rồi tải lên ở Settings → Capabilities → Skills.

Yêu cầu: `ffmpeg`, `python3` + `Pillow`, CLI `belt` (inference.sh) để tạo ảnh/giọng/nhạc,
tùy chọn `pip install faster-whisper` để phụ đề khớp chính xác, font "Be Vietnam Pro" cho phụ đề.

## Dùng nhanh
Nói với Claude: *"Làm video khoa học nét vẽ 2 phút về chủ đề: vì sao ta ngáp lây?"*
Claude sẽ chạy 5 bước, dừng cho bạn duyệt kịch bản và 3 ảnh mẫu trước khi tạo hàng loạt.
