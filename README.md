# NextStep
## A clearer way back.

NextStep is an interruption-friendly student workspace for [Taskforge](https://taskforge.devpost.com/). It helps a student turn a project into concrete steps, focus on one action, and leave a precise breadcrumb before stepping away. Returning after a reload reveals the saved context and the very next action.

**User and barrier:** a hypothetical university student repeatedly interrupted while preparing coursework. A conventional checklist records what remains but often loses the context of where the student stopped. This prototype focuses on recoverability rather than accumulating more tasks. No user interviews, medical outcomes, measured productivity gains, or accessibility certification are claimed.

[Open the live public app](https://nextstep-taskforge-2026.electalder.chatgpt.site) · [GitHub source](https://github.com/Tomhao10225101490/NextStep-Taskforge)

## Run it

Node.js 22.23.3 was tested. The application has no runtime packages or API keys.

```bash
npm run dev
```

Open http://127.0.0.1:8510. For tests:

```bash
npm ci
npm test
npm run check
```

Any static HTTP host can serve the `dist/` directory. ES modules require an HTTP origin; opening index.html directly through file:// is not supported. All application scripts, styles and icons are served locally; there are no analytics, external fonts, AI calls or accounts inside the application.

## Try the recovery loop

1. Choose **Explore a sample** (the sample is explicitly fictional), or create a project with one action per line.
2. Mark the first step done and choose **Focus on this step**. The rest of the workspace is visually removed.
3. Optionally start a 5, 15 or 25 minute timer. It uses elapsed wall-clock time across tab backgrounding and reloads; it never auto-completes a task.
4. Choose **Save my place**. Write a little context and a precise next action. Saving pauses the timer.
5. Reload the page. The return card preserves both fields and offers **Resume from here**.
6. Resume in focus mode with the saved breadcrumb beside the original planned step. Marking a planned step done clears its old breadcrumb. A one-level undo is available in the current session.

The breadcrumb is not a second task silently marked complete: the original planned step remains the completion target. Quick capture parks unrelated thoughts without changing the active task.

## Designed for access

Native buttons, labeled form fields, dialogs, landmarks, an explicit skip link, visible focus rings, non-color completion indicators, optional larger text and higher contrast, and reduced-motion preferences are built in. Shortcuts: N creates a plan; F focuses the current step; Escape exits focus. Shortcuts are inactive while typing or inside a dialog. Critical status changes use a polite live region; the timer does not announce every second.

Automated semantic checks run axe-core in JSDOM with layout-dependent color contrast excluded. Real browser checks cover the primary loop, keyboard shortcuts, text/contrast settings and backup/restore. These checks are **not** a WCAG conformance claim. Screen-reader testing with assistive-technology users and a broader device matrix remain future work. See [accessibility and verification notes](docs/VERIFICATION.md).

## Your data

Projects, notes and preferences are saved in localStorage on the current browser origin. There is no server database, cross-device sync, encryption, or login inside the app. Data is not shared with other visitors. Clearing browser data, switching origins/devices or using temporary browsing can remove access; export a JSON backup.

Restore validates the entire backup before changing state, enforces size and count limits, normalizes allowed fields, and requires an explicit replacement checkbox. Text is rendered through textContent rather than interpreted as HTML. Corrupt saved data is quarantined, not overwritten. If another tab writes to this workspace, stale writes are blocked and the user is prompted to export before reloading. This is conflict detection, not collaborative synchronization. Exported files may include personal notes and should be stored carefully.

Limits: 100 projects, 50 steps per project, 200 captured thoughts; 1 MB restore file size. The timer depends on the device clock, so clock changes can affect elapsed time. Undo is session-local. Editing a step uses the browser's native prompt. There are no notifications when the page is closed, reminders, AI-generated plans, clinical features or claims of improved grades.

## Technical implementation

- `dist/model.js`: pure transitions and schema validation, including timer arithmetic, checkpoints, completion and restore.
- `dist/app.js`: DOM rendering, event handling, persistence, keyboard and dialog flows.
- `dist/style.css`: responsive layout and reading preferences; no external asset dependency.
- `server.js`: minimal local static server with path confinement.
- `tests/`: domain, integration and semantic accessibility checks.
- `results/`: executed test logs and a fictional backup downloaded from the browser during verification.
- `docs/`: design rationale, verification limits, Devpost submission text and progress.
- `demo/`: actual application captures and narrated demo materials.

The app uses native browser APIs, not a hidden backend or a mocked AI service. Sites publication metadata is isolated in `.openai/hosting.json`; local task data is not included in deployments.

## What is original here?

The contribution is a compact implementation of a recovery-first workflow: a checkpoint is bound to the current planned step, pauses the timer, survives reload, and becomes a return card and focus-context note. Defensive storage behavior protects that context when a backup is invalid or another tab changes state. Step decomposition and focus timers themselves are established ideas; no novelty claim is made for inventing them.

This implementation was created from a new directory during the Taskforge event period, using Codex assistance. It does not reuse the separate QuantumNoise Lab implementation, experimental data or submission. The brief calls for disclosure of AI assistance and pre-existing work; this paragraph provides that disclosure. The demo uses fictional notes entered for demonstration, not private user records.

## Validation

20 automated tests pass. They cover round-trip persistence, malformed restore files, correct timer pause/resume, checkpoint lifetime, completion/undo, text injection resistance, shortcut scope, corrupt-data quarantine, stale-tab protection and preservation of typed text at timer expiry. The semantic audit found no violations within the configured JSDOM scope. See results/tests.log and docs/VERIFICATION.md; no external participant study was performed.

## Submission materials

[Watch the 2:25 demo](https://youtu.be/QRoKImiS9F4) · [Download video/captions](https://github.com/Tomhao10225101490/NextStep-Taskforge/releases/tag/demo-v1) · [Devpost project](https://devpost.com/software/nextstep-l1erpi) · [Project story](docs/DEVPOST_SUBMISSION.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Progress](docs/PROGRESS.md).

Taskforge's published submission deadline is November 24, 2026 at 17:00 EST, equivalent to November 25 at 06:00 Asia/Shanghai. See the [official schedule](https://taskforge.devpost.com/details/dates) and [rules](https://taskforge.devpost.com/rules).

Original project code: MIT license. Development tools retain their respective licenses. Locked test dependencies: JSDOM, axe-core and Prettier. Native dialogs and localStorage follow browser standards; see [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) and [MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).
