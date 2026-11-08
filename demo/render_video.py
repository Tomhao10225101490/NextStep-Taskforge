"""Assemble an edited walkthrough from actual Chrome captures and synthetic narration."""

import json
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "demo"
TEMP = ROOT / "outputs/video"
TEMP.mkdir(parents=True, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
W, H, FPS = 1280, 720, 12
PAPER = "#f6f5f0"
INK = "#243a35"
GREEN = "#254d45"


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


def text_lines(draw, text, font_value, width):
    lines = []
    line = ""
    for word in text.split():
        candidate = (line + " " + word).strip()
        if line and draw.textlength(candidate, font=font_value) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def shot(name, chapter):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.text((26, 16), "NextStep", font=font(25, True), fill=GREEN)
    d.text((170, 22), "A CLEARER WAY BACK", font=font(13), fill="#596b62")
    d.text(
        (970, 22),
        f"TASKFORGE / CHAPTER {chapter + 1:02}",
        font=font(13),
        fill="#596b62",
    )
    d.line((25, 53, 1255, 53), fill="#cbd6cb", width=1)
    screenshot = Image.open(DEMO / f"captures/{name}.jpg").convert("RGB")
    screenshot = ImageOps.contain(screenshot, (1240, 565))
    im.paste(
        screenshot, ((W - screenshot.width) // 2, 63 + (565 - screenshot.height) // 2)
    )
    return im


def closing():
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.text((48, 35), "NextStep / TASKFORGE 2026", font=font(22, True), fill=GREEN)
    d.text((48, 125), "Leave a clearer way back.", font=font(56, True), fill=INK)
    rows = [
        (
            "20 automated checks passed",
            "Model, DOM and scoped semantic accessibility checks.",
        ),
        (
            "Recovery verified in the browser",
            "Save context → reload → resume. Real JSON download and restore.",
        ),
        (
            "Honest limits",
            "Fictional scenario; no measured productivity gains or WCAG certification.",
        ),
    ]
    y = 255
    for title, body in rows:
        d.text((52, y), title, font=font(29, True), fill=GREEN)
        d.text((52, y + 44), body, font=font(23), fill=INK)
        y += 113
    d.text(
        (48, 606),
        "github.com/Tomhao10225101490/NextStep-Taskforge",
        font=font(23),
        fill=INK,
    )
    return im


def stamp(seconds):
    ms = round(seconds * 1000)
    s, ms = divmod(ms, 1000)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    texts = json.loads((DEMO / "narration.json").read_text())
    durations = []
    audio = []
    for i, text in enumerate(texts):
        txt = TEMP / f"{i:02}.txt"
        txt.write_text(text)
        aiff = TEMP / f"{i:02}.aiff"
        wav = TEMP / f"{i:02}.wav"
        if not wav.exists():
            subprocess.run(
                ["say", "-v", "Daniel", "-r", "165", "-f", str(txt), "-o", str(aiff)],
                check=True,
            )
            subprocess.run(
                [FF, "-y", "-i", str(aiff), "-ar", "48000", "-ac", "1", str(wav)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
        with wave.open(str(wav)) as f:
            durations.append(f.getnframes() / f.getframerate())
            audio.append(f.readframes(f.getnframes()))
    chapters = []
    cursor = 1.0
    for i, duration in enumerate(durations):
        chapters.append({"index": i, "start": cursor, "duration": duration})
        cursor += duration + 2
    total = cursor + 1
    with wave.open(str(TEMP / "narration.wav"), "wb") as out:
        out.setparams((1, 2, 48000, 0, "NONE", "not compressed"))
        out.writeframes(bytes(96000))
        for data in audio:
            out.writeframes(data)
            out.writeframes(bytes(192000))
        out.writeframes(bytes(96000))
    subtitles = []
    for chapter, text in zip(chapters, texts, strict=True):
        words = text.split()
        chunks = []
        chunk = []
        for word in words:
            chunk.append(word)
            if len(" ".join(chunk)) >= 104 or (
                word.endswith((".", "?")) and len(chunk) > 6
            ):
                chunks.append(" ".join(chunk))
                chunk = []
        if chunk:
            chunks.append(" ".join(chunk))
        consumed = 0
        for chunk in chunks:
            length = len(chunk.split()) / len(words) * chapter["duration"]
            start = chapter["start"] + consumed
            subtitles.append({"start": start, "end": start + length, "text": chunk})
            consumed += length
    (DEMO / "NextStep.en.srt").write_text(
        "\n\n".join(
            f"{i + 1}\n{stamp(s['start'])} --> {stamp(s['end'])}\n{s['text']}"
            for i, s in enumerate(subtitles)
        )
        + "\n"
    )
    cards = {
        "empty": shot("empty", 0),
        "plan": shot("plan", 1),
        "focus": shot("native_focus", 1),
        "save": shot("checkpoint_form", 2),
        "saved": shot("native_recovery", 2),
        "return": shot("native_recovery", 3),
        "resume": shot("native_resume_focus", 3),
        "settings": shot("native_access", 4),
        "contrast": shot("native_high_contrast", 4),
        "backup": shot("native_backup", 4),
        "restore": shot("native_restore", 4),
        "closing": closing(),
    }
    output = DEMO / "NextStep-demo.mp4"
    cmd = [
        FF,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        "1280x720",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-i",
        str(TEMP / "narration.wav"),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-shortest",
        str(output),
    ]
    cache = {}
    with (TEMP / "render.log").open("w") as log:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=log, stderr=log)
        for frame in range(round(total * FPS)):
            now = frame / FPS
            c = next((c for c in reversed(chapters) if now >= c["start"]), chapters[0])
            f = (now - c["start"]) / c["duration"]
            i = c["index"]
            if i == 0:
                key = "empty"
            elif i == 1:
                key = "plan" if f < 0.48 else "focus"
            elif i == 2:
                key = "save" if f < 0.72 else "saved"
            elif i == 3:
                key = "return" if f < 0.45 else "resume"
            elif i == 4:
                key = (
                    "settings"
                    if f < 0.23
                    else "contrast"
                    if f < 0.42
                    else "backup"
                    if f < 0.72
                    else "restore"
                )
            else:
                key = "closing"
            caption = next(
                (s["text"] for s in subtitles if s["start"] <= now < s["end"]), ""
            )
            if (key, caption) not in cache:
                im = cards[key].copy()
                d = ImageDraw.Draw(im)
                d.rectangle((0, 644, W, H), fill=GREEN)
                for n, line in enumerate(text_lines(d, caption, font(23), 1190)):
                    d.text((45, 654 + n * 28), line, font=font(23), fill="white")
                cache[(key, caption)] = im.tobytes()
            proc.stdin.write(cache[(key, caption)])
        proc.stdin.close()
        if proc.wait():
            raise RuntimeError("Rendering failed; inspect outputs/video/render.log")
    metadata = {
        "duration_seconds": total,
        "resolution": [W, H],
        "fps": FPS,
        "narration": "macOS Daniel synthetic English voice at 165 wpm",
        "chapters": chapters,
        "capture_source": "Actual local Chrome UI; browser chrome and unrelated tabs cropped out.",
        "editing": "Edited walkthrough with held screenshots, not an uncut continuous recording.",
        "captions": "English, burned in plus SRT; approximate script-based timing.",
        "claims": "Fictional student scenario; no real user study, measured productivity gains, or WCAG certification.",
    }
    (DEMO / "metadata.json").write_text(json.dumps(metadata, indent=2))
    cards["empty"].save(DEMO / "poster.png")
    print(json.dumps(metadata, indent=2), flush=True)


if __name__ == "__main__":
    main()
