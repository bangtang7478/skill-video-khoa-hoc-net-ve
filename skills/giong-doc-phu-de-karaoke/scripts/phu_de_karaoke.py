#!/usr/bin/env python3
"""Tạo phụ đề karaoke (.ass) cho video khoa học: mỗi lần hiện 2–4 chữ, chữ đang đọc đổi màu.

Đầu vào: work/scenes.json (trường "id", "voice") + work/audio/<id>.mp3|wav
Đầu ra : work/captions.ass  (dựng bằng skill dung-video-khoa-hoc)

Thời gian từng chữ:
  - Có faster-whisper (pip install faster-whisper): nhận dạng tiếng Việt với word_timestamps rồi
    căn về đúng chữ trong kịch bản (giữ chính tả kịch bản, chỉ lấy mốc thời gian).
  - Không có: chia đều theo độ dài chữ trong từng cảnh (đủ dùng, kém chính xác hơn).

Dùng: python3 phu_de_karaoke.py work [--gap 0.3] [--words 3] [--res 1920x1080] [--no-whisper]
--gap phải bằng --gap của build_video.py (khoảng nghỉ thêm sau mỗi cảnh).
"""
import argparse, difflib, glob, json, os, re, subprocess

def dur(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", p])
    return float(json.loads(out)["format"]["duration"])

def norm(w):
    return re.sub(r"[^\w]", "", w.lower())

def even_times(words, d):
    """Chia thời gian theo số ký tự, chừa 0.15s đầu/cuối."""
    lead, tail = 0.15, 0.15
    usable = max(0.1, d - lead - tail)
    weights = [len(norm(w)) + 2 + (4 if re.search(r"[,.!?…:;]$", w) else 0) for w in words]
    tot = sum(weights); t = lead; out = []
    for w, k in zip(words, weights):
        step = usable * k / tot
        out.append((t, t + step)); t += step
    return out

_model = None
def whisper_times(words, audio, d):
    global _model
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel(os.environ.get("WHISPER_MODEL", "small"), compute_type="int8")
    segs, _ = _model.transcribe(audio, language="vi", word_timestamps=True, vad_filter=False)
    hyp = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or []) if w.word.strip()]
    if not hyp:
        return even_times(words, d)
    a = [norm(w) for w in words]; b = [norm(h[0]) for h in hyp]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(words)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (hyp[j1 + k][1], hyp[j1 + k][2])
        elif tag == "replace" and j2 > j1:  # chia khoảng thời gian của đoạn khác chữ
            t0, t1 = hyp[j1][1], hyp[j2 - 1][2]; n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
    # lấp chỗ trống bằng nội suy
    ev = even_times(words, d)
    for i, t in enumerate(times):
        if t is None:
            prev_end = times[i - 1][1] if i and times[i - 1] else ev[i][0]
            nxt = next((times[j][0] for j in range(i + 1, len(times)) if times[j]), ev[i][1])
            times[i] = (prev_end, max(prev_end + 0.05, min(nxt, prev_end + (ev[i][1] - ev[i][0]))))
    return times

def chunks(words, n):
    """Nhóm n chữ, ưu tiên ngắt ở dấu câu."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if len(cur) >= n or re.search(r"[,.!?…:;]$", w):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work"); ap.add_argument("--gap", type=float, default=0.3)
    ap.add_argument("--words", type=int, default=3); ap.add_argument("--res", default="1920x1080")
    ap.add_argument("--no-whisper", action="store_true")
    ap.add_argument("--font", default="Be Vietnam Pro ExtraBold")
    ap.add_argument("--hi", default="3BAA3B", help="màu chữ đang đọc (hex RGB)")
    a = ap.parse_args()
    W, H = map(int, a.res.split("x"))
    scenes = json.load(open(os.path.join(a.work, "scenes.json"), encoding="utf-8"))
    use_whisper = not a.no_whisper
    if use_whisper:
        try:
            import faster_whisper  # noqa
        except ImportError:
            print("Chưa có faster-whisper -> chia đều thời gian. (pip install faster-whisper để chính xác hơn)")
            use_whisper = False

    r, g, b = a.hi[0:2], a.hi[2:4], a.hi[4:6]
    hi = f"&H00{b}{g}{r}&"  # ASS dùng BGR
    fs = int(H * 0.065)
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 2", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Cap,{a.font},{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,{max(3, fs // 12)},2,2,60,60,{int(H * 0.05)},1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    offset = 0.0
    for sc in scenes:
        sid = sc["id"]
        au = next((p for p in sorted(glob.glob(os.path.join(a.work, "audio", sid + ".*")))
                   if p.endswith((".mp3", ".wav", ".m4a"))), None)
        if not au:
            raise SystemExit(f"Thiếu audio cho cảnh {sid}")
        d = dur(au)
        words = sc["voice"].split()
        times = whisper_times(words, au, d) if use_whisper else even_times(words, d)
        for grp in chunks(words, a.words):
            g_end = times[grp[-1]][1]
            for k, wi in enumerate(grp):
                start = times[wi][0]
                end = times[grp[k + 1]][0] if k + 1 < len(grp) else g_end
                text = " ".join(
                    (f"{{\\c{hi}}}{words[j]}{{\\c&H00FFFFFF&}}" if j == wi else words[j]) for j in grp)
                lines.append(f"Dialogue: 0,{ts(offset + start)},{ts(offset + max(end, start + 0.05))},Cap,,0,0,0,,{text}")
        offset += d + a.gap
        print(f"{sid}: {len(words)} chữ, {d:.1f}s")
    out = os.path.join(a.work, "captions.ass")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("Đã tạo", out, f"(tổng {offset:.1f}s)")

if __name__ == "__main__":
    main()
