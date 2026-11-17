#!/usr/bin/env python3
"""Dựng video khoa học nét vẽ từ thư mục work.

Cấu trúc:
  work/scenes.json                 (thứ tự cảnh theo "id")
  work/scenes/<id>.png|jpg|mp4     (mp4 được ưu tiên; clip ngắn hơn lời đọc sẽ lặp)
  work/audio/<id>.mp3|wav
  work/captions.ass                (tùy chọn, từ phu_de_karaoke.py)
  work/music.mp3                   (tùy chọn, tự lặp, tự hạ khi có giọng)
  work/avatar.png                  (tùy chọn, logo/avatar kênh nhỏ góc dưới phải)
Dùng:
  python3 build_video.py work out.mp4 [--res 1920x1080] [--gap 0.3] [--zoom 0.04] [--music-vol 0.10]
"""
import argparse, glob, json, os, subprocess

def dur(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", p])
    return float(json.loads(out)["format"]["duration"])

def run(cmd):
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if r.returncode:
        raise SystemExit("ffmpeg lỗi:\n" + r.stderr[-2000:])

def esc(p):  # đường dẫn trong filter ffmpeg
    return os.path.abspath(p).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work"); ap.add_argument("out")
    ap.add_argument("--res", default="1920x1080"); ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--gap", type=float, default=0.3, help="nghỉ sau mỗi cảnh (phải trùng phu_de_karaoke.py)")
    ap.add_argument("--zoom", type=float, default=0.04, help="mức zoom nhẹ mỗi ảnh, 0 = ảnh đứng yên")
    ap.add_argument("--music-vol", type=float, default=0.10)
    ap.add_argument("--fontsdir", help="thư mục font cho phụ đề .ass")
    a = ap.parse_args()
    W, H = map(int, a.res.split("x")); fps = a.fps
    scenes = json.load(open(os.path.join(a.work, "scenes.json"), encoding="utf-8"))
    seg_dir = os.path.join(a.work, "_segs"); os.makedirs(seg_dir, exist_ok=True)
    segs = []
    for i, sc in enumerate(scenes):
        sid = sc["id"]
        au = next((p for p in sorted(glob.glob(os.path.join(a.work, "audio", sid + ".*")))
                   if p.endswith((".mp3", ".wav", ".m4a"))), None)
        if not au:
            raise SystemExit(f"Thiếu audio cho cảnh {sid}")
        d = dur(au) + a.gap
        clip = os.path.join(a.work, "scenes", sid + ".mp4")
        img = next((p for p in sorted(glob.glob(os.path.join(a.work, "scenes", sid + ".*")))
                    if p.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))), None)
        seg = os.path.join(seg_dir, f"{sid}.mp4")
        common = ["-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                  "-r", str(fps), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", seg]
        if os.path.exists(clip):
            vf = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:white,fps={fps},setsar=1"
            run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", clip, "-i", au, "-map", "0:v", "-map", "1:a",
                 "-vf", vf, "-af", "apad", *common])
        elif img:
            n = int(d * fps) + 1
            if a.zoom > 0:  # zoom rất nhẹ, luân phiên vào/ra, giữ chữ trong tranh đọc được
                z = (f"1+{a.zoom}*on/{n}" if i % 2 == 0 else f"{1 + a.zoom}-{a.zoom}*on/{n}")
                vf = (f"scale={W*2}:{H*2}:force_original_aspect_ratio=decrease,pad={W*2}:{H*2}:(ow-iw)/2:(oh-ih)/2:white,"
                      f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={fps},setsar=1")
            else:
                vf = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:white,setsar=1"
            run(["ffmpeg", "-y", "-loop", "1", "-framerate", str(fps), "-i", img, "-i", au,
                 "-map", "0:v", "-map", "1:a", "-vf", vf, "-af", "apad", *common])
        else:
            raise SystemExit(f"Thiếu hình cho cảnh {sid}")
        segs.append(seg)
        print(f"[{i + 1}/{len(scenes)}] {sid} {d:.1f}s")

    lst = os.path.join(seg_dir, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(s)}'\n" for s in segs)
    body = os.path.join(seg_dir, "body.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", body])

    inputs = ["-i", body]; chain = "[0:v]null"; idx = 1
    ass = os.path.join(a.work, "captions.ass")
    if os.path.exists(ass):
        chain += f",subtitles='{esc(ass)}'" + (f":fontsdir='{esc(a.fontsdir)}'" if a.fontsdir else "")
    fc = chain + "[v0]"; vlab = "v0"
    avatar = os.path.join(a.work, "avatar.png")
    if os.path.exists(avatar):
        inputs += ["-i", avatar]
        s = H // 12
        fc += f";[{idx}:v]scale={s}:{s}[av];[v0][av]overlay=W-w-{W // 40}:H-h-{H // 30}[v1]"; vlab = "v1"; idx += 1
    alab = "0:a"
    music = os.path.join(a.work, "music.mp3")
    if os.path.exists(music):
        inputs += ["-stream_loop", "-1", "-i", music]
        fc += (f";[{idx}:a]volume={a.music_vol}[m];[0:a]asplit[vo][sc];"
               f"[m][sc]sidechaincompress=threshold=0.03:ratio=6:release=400[md];"
               f"[vo][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
        alab = "[aout]"
    else:
        fc += ";[0:a]loudnorm=I=-14:TP=-1.5:LRA=11[aout]"; alab = "[aout]"
    run(["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", f"[{vlab}]", "-map", alab,
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", a.out])
    print("Xong:", a.out, f"{dur(a.out):.1f}s")

if __name__ == "__main__":
    main()
