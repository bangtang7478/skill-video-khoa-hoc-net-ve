#!/usr/bin/env python3
"""Chèn chữ tiếng Việt (tiêu đề đỏ, banner, nhãn) lên ảnh cảnh khi model ảnh viết sai dấu.

Dùng:
  python3 them_chu.py in.png out.png --title "NHU CẦU NGỦ KHÁC NHAU" --banner "ĐỦ 8 TIẾNG"
  python3 them_chu.py in.png out.png --label "CAFFEINE@0.70,0.20"   # nhãn tại (x,y) theo tỉ lệ 0..1
  python3 them_chu.py in.png thumb.png --title "NGỦ 8 TIẾNG LÀ SAI?" --size 1280x720 --title-scale 1.6
Tùy chọn --font để dùng font riêng (nên chọn font có đủ dấu tiếng Việt, VD Be Vietnam Pro ExtraBold, Baloo 2).
"""
import argparse, os, subprocess
from PIL import Image, ImageDraw, ImageFont

RED = (215, 38, 43); WHITE = (255, 255, 255); BLACK = (25, 25, 25)

def find_font(user=None):
    if user and os.path.exists(user):
        return user
    for f in ["/usr/share/fonts/truetype/noto/NotoSans-Black.ttf",
              "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/Library/Fonts/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(f):
            return f
    try:
        return subprocess.check_output(["fc-match", "-f", "%{file}", "sans:bold"]).decode()
    except Exception:
        raise SystemExit("Không tìm thấy font, hãy truyền --font")

def fit(draw, text, font_path, max_w, size):
    while size > 10:
        f = ImageFont.truetype(font_path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(font_path, size)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--title"); ap.add_argument("--banner")
    ap.add_argument("--label", action="append", default=[], help='"TEXT@x,y" (tỉ lệ 0..1)')
    ap.add_argument("--font"); ap.add_argument("--size", help="WxH, VD 1920x1080")
    ap.add_argument("--title-scale", type=float, default=1.0)
    a = ap.parse_args()

    im = Image.open(a.inp).convert("RGB")
    if a.size:
        W, H = map(int, a.size.split("x"))
        s = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        l, t = (im.width - W) // 2, (im.height - H) // 2
        im = im.crop((l, t, l + W, t + H))
    W, H = im.size
    d = ImageDraw.Draw(im)
    fp = find_font(a.font)

    if a.title:
        f = fit(d, a.title.upper(), fp, W * 0.9, int(H * 0.085 * a.title_scale))
        tw = d.textlength(a.title.upper(), font=f)
        d.text(((W - tw) / 2, H * 0.04), a.title.upper(), font=f, fill=RED,
               stroke_width=max(2, f.size // 18), stroke_fill=WHITE)
    if a.banner:
        f = fit(d, a.banner.upper(), fp, W * 0.6, int(H * 0.075))
        tw = d.textlength(a.banner.upper(), font=f)
        pad = f.size * 0.45
        bw, bh = tw + pad * 2, f.size * 1.5
        x0, y0 = (W - bw) / 2, H * 0.80 - bh  # chừa 1/6 dưới cho phụ đề
        d.rectangle([x0, y0, x0 + bw, y0 + bh], fill=RED, outline=BLACK, width=max(3, f.size // 12))
        d.text((W / 2, y0 + bh * 0.56), a.banner.upper(), font=f, fill=WHITE, anchor="mm")
    for lab in a.label:
        text, _, pos = lab.rpartition("@")
        x, y = (float(v) for v in pos.split(","))
        f = ImageFont.truetype(fp, int(H * 0.055))
        tw = d.textlength(text.upper(), font=f)
        d.text((W * x - tw / 2, H * y), text.upper(), font=f, fill=BLACK,
               stroke_width=max(2, f.size // 14), stroke_fill=WHITE)
    im.save(a.out)
    print("Đã lưu", a.out)

if __name__ == "__main__":
    main()
