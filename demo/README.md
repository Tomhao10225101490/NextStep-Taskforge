# Edited English walkthrough

NextStep-demo.mp4 is a 2:25, 1280×720 H.264/AAC edited demonstration with English burned-in captions and a separate SRT. Narration uses the macOS Daniel system voice, explicitly disclosed as synthetic.

Every application scene in the video is captured from the user's local Chrome session. Browser chrome and unrelated tabs are cropped out; raw uncropped captures remain under ignored .private/ and are not published. The notes are fictional demonstration data. Captures are held and cut to match narration: this is not an uncut continuous recording. Caption alignment is approximated from script chunks within each narration segment.

The recording shows a real plan, completion, keyboard focus entry, timer, filled checkpoint, actual reload, recovered breadcrumb, text/contrast preferences and actual JSON backup download/restore. The closing card reports the executed 20 automated checks and explicitly avoids user-productivity or accessibility-certification claims. Initial QA used the in-app browser before the user requested local Chrome; subsequent recording, deployment verification and submission use local Chrome.

Reproduction on macOS: create a Python 3.12 environment, install demo/requirements.txt and run python demo/render_video.py. Native say generates temporary audio and imageio-ffmpeg supplies encoding. Temporary media is kept under outputs/, excluded from Git. Generic local media tooling was reused from the development environment; the application, narration and product footage were created for Taskforge.

The complete encoded video was decoded by FFmpeg without errors; representative frames from all six chapters were visually checked. demo/verification.json preserves the video hash and technical metadata.
