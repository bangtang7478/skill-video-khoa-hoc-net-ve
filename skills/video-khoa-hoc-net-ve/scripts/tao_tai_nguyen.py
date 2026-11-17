#!/usr/bin/env python3
"""Tạo ảnh + giọng đọc cho mọi cảnh trong work/scenes.json (bước 3 và 4 của bộ skill, chạy tự động).

- Ảnh: inference.sh (belt) qua Python SDK `inferencesh`, model mặc định Nano Banana 2, tỉ lệ 16:9,
  phong cách STYLE của skill ve-tranh-khoa-hoc-net-don-gian. Ảnh vẽ KHÔNG chữ, rồi chèn tiêu đề/banner
  tiếng Việt bằng them_chu.py để dấu luôn đúng.
- Giọng: mặc định edge-tts (giọng Azure tiếng Việt miễn phí, không cần key); hoặc --tts inworld qua inference.sh.
- Bỏ qua cảnh đã có file (chạy lại an toàn khi lỗi giữa chừng).

Biến môi trường: INFERENCE_API_KEY (bắt buộc cho ảnh và --tts inworld).
Dùng: python3 tao_tai_nguyen.py work [--giong vi-VN-NamMinhNeural] [--tts edge|inworld] [--voice-id ...]
      [--image-app google/gemini-3-1-flash-image] [--mascot "mô tả linh vật tiếng Anh"] [--song-song 4]
scenes.json: [{"id","voice","visual","visual_en","nhanVat":"host|ban|both|none",
               "onscreen_text":{"title","banner"}}]
"""
import argparse, asyncio, concurrent.futures as cf, json, os, re, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
THEM_CHU = os.path.join(HERE, "..", "..", "ve-tranh-khoa-hoc-net-don-gian", "scripts", "them_chu.py")
STYLE = ("simple hand-drawn educational explainer cartoon, thick black ink outlines, flat colors, minimal shading, "
         "round-headed stick-figure characters with big expressive faces, clean pastel flat background, "
         "whiteboard explainer doodle style, slightly rough marker texture, 16:9 composition, lots of empty space "
         "at the top and the bottom sixth, centered subject, high contrast, no gradients, no photorealism, "
         "no text, no letters, no words, no numbers, no watermark")
HOST = ("a round-headed stick-figure scientist with small round glasses, an orange safety helmet, "
        "a green scarf and a white lab coat, holding a pointer stick")
YOU = "a round-headed stick-figure person with a few messy hair strokes and a plain blue t-shirt"

def urls(obj):
    """Lấy mọi URL http(s) trong kết quả trả về (cấu trúc output khác nhau giữa các app)."""
    if isinstance(obj, str):
        return [obj] if obj.startswith("http") else []
    if isinstance(obj, dict):
        return [u for v in obj.values() for u in urls(v)]
    if isinstance(obj, (list, tuple)):
        return [u for v in obj for u in urls(v)]
    return []

def tai(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "skill-video-khoa-hoc"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
        f.write(r.read())

_client = None
def infsh(app, inp):
    global _client
    if _client is None:
        from inferencesh import inference
        key = os.environ.get("INFERENCE_API_KEY")
        _client = inference(api_key=key) if key else inference()
    res = _client.run({"app": app, "input": inp})
    out = res.get("output", res) if isinstance(res, dict) else res
    found = urls(out)
    if not found:
        raise RuntimeError(f"{app} không trả về URL: {str(out)[:300]}")
    return found

def nhan_vat(sc, host, you):
    k = (sc.get("nhanVat") or "").lower()
    if "both" in k or "hai" in k:
        return f"{host} and {you}, "
    if "host" in k or "linh" in k:
        return host + ", "
    if "ban" in k or "you" in k:
        return you + ", "
    return ""

def tao_anh(sc, a, outdir):
    sid = sc["id"]
    final = os.path.join(outdir, f"{sid}.png")
    if os.path.exists(final) or os.path.exists(os.path.join(outdir, f"{sid}.mp4")):
        return f"{sid}: đã có ảnh"
    raw = os.path.join(outdir, f"{sid}.raw.png")
    if not os.path.exists(raw):
        prompt = nhan_vat(sc, a.mascot, YOU) + (sc.get("visual_en") or sc.get("visual") or "") + ", " + STYLE
        u = infsh(a.image_app, {"prompt": prompt, "aspect_ratio": "16:9"})[0]
        tai(u, raw)
    ot = sc.get("onscreen_text") or {}
    cmd = [sys.executable, THEM_CHU, raw, final, "--size", "1920x1080"]
    if ot.get("title"):
        cmd += ["--title", ot["title"]]
    if ot.get("banner"):
        cmd += ["--banner", ot["banner"]]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)
    return f"{sid}: ảnh xong"

def tao_giong(sc, a, outdir):
    sid = sc["id"]
    path = os.path.join(outdir, f"{sid}.mp3")
    if os.path.exists(path):
        return f"{sid}: đã có giọng"
    text = sc.get("tts") or sc["voice"]
    if a.tts == "edge":
        import edge_tts
        asyncio.run(edge_tts.Communicate(text, a.giong, rate=a.toc_do).save(path))
    else:
        inp = {"text": text, "delivery_mode": "BALANCED"}
        if a.voice_id:
            inp["voice_id"] = a.voice_id
        u = [x for x in infsh("inworld/text-to-speech-2", inp) if re.search(r"\.(mp3|wav|m4a|ogg)", x)] or \
            infsh("inworld/text-to-speech-2", inp)
        tai(u[0], path)
    return f"{sid}: giọng xong"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("--giong", default="vi-VN-NamMinhNeural", help="giọng edge-tts (vi-VN-NamMinhNeural | vi-VN-HoaiMyNeural)")
    ap.add_argument("--toc-do", default="+8%", help="tốc độ đọc edge-tts")
    ap.add_argument("--tts", choices=["edge", "inworld"], default="edge")
    ap.add_argument("--voice-id")
    ap.add_argument("--image-app", default="google/gemini-3-1-flash-image")
    ap.add_argument("--mascot", default=HOST)
    ap.add_argument("--song-song", type=int, default=4)
    a = ap.parse_args()
    mfile = os.path.join(a.work, "mascot.txt")
    if os.path.exists(mfile):
        a.mascot = open(mfile, encoding="utf-8").read().strip() or a.mascot
    scenes = json.load(open(os.path.join(a.work, "scenes.json"), encoding="utf-8"))
    img_dir = os.path.join(a.work, "scenes"); au_dir = os.path.join(a.work, "audio")
    os.makedirs(img_dir, exist_ok=True); os.makedirs(au_dir, exist_ok=True)
    loi = []
    with cf.ThreadPoolExecutor(a.song_song) as ex:
        jobs = [ex.submit(tao_giong, sc, a, au_dir) for sc in scenes] + \
               [ex.submit(tao_anh, sc, a, img_dir) for sc in scenes]
        for j in cf.as_completed(jobs):
            try:
                print(j.result(), flush=True)
            except Exception as e:  # ghi lại, chạy tiếp cảnh khác
                loi.append(str(e)); print("LỖI:", e, flush=True)
    if loi:
        raise SystemExit(f"{len(loi)} việc lỗi, chạy lại lệnh để thử lại các cảnh còn thiếu.")
    print("Xong tài nguyên cho", len(scenes), "cảnh")

if __name__ == "__main__":
    main()
