# Project Name
NextStep

## Elevator Pitch
A clearer way back to your work. Turn a project into small actions, focus on one step, and save a precise breadcrumb so interruptions do not erase your context.

## Inspiration
A checklist can tell you what is unfinished without telling you where to restart. We focused on a hypothetical university student working on a course brief, getting interrupted, and returning to a task whose context has gone missing. NextStep treats returning as part of the workflow rather than a failure to stay focused.

This scenario is illustrative. We did not conduct user interviews or a participant study and do not claim measured productivity or clinical outcomes.

## What It Does
NextStep is a browser-local workspace that turns a project into concrete steps and shows one active action in focus mode. Before stepping away, the student can save what they were doing and the exact next action. That checkpoint pauses the optional timer and remains available after a page reload. Returning presents a clear resume card, then the saved context inside focus mode.

A quick-capture inbox parks unrelated thoughts without replacing the active step. Reading settings provide higher contrast and larger text. Keyboard controls, labeled fields, native dialogs, visible focus indicators and status announcements support alternative ways to navigate. JSON export and explicitly confirmed restore let users keep their own backup.

## How We Built It
The runtime is a small static application built with native JavaScript, HTML, CSS and browser storage. No account, analytics, AI endpoint or private API key is required by the app. Pure model functions handle validation, timer arithmetic, checkpoints and completion; a separate DOM layer handles interaction and persistence.

The timer uses elapsed wall-clock time, so backgrounding or reloading the page does not restart the countdown. A checkpoint is bound to a planned step and is cleared when that step is completed. The app preserves unreadable stored data instead of silently overwriting it, rejects malformed imports before mutation, and blocks stale writes when another tab changes the workspace.

Development checks use Node's test runner, JSDOM and axe-core. The source and build instructions make the prototype independently runnable.

## Challenges We Ran Into
Recoverability is more than saving a note. Finishing a timer originally rebuilt the workspace and could remove text being typed into the add-step field. We changed expiration handling so it updates timer controls without replacing that input. We also separated the saved next action from completion of the original planned step, avoiding silent task completion when a smaller breadcrumb action is done.

Storage failure and multiple tabs were another challenge. The prototype now makes unsaved state visible and protects the existing stored workspace rather than pretending every write succeeded.

## Accomplishments
We implemented and exercised the complete interruption-and-return loop in a real browser: complete a step, enter focus mode, start the timer, save a breadcrumb, reload, and resume with the exact saved action. A backup file was actually downloaded and restored through the browser's file chooser with explicit replacement confirmation.

20 automated tests pass, including model and DOM checks and a scoped semantic accessibility audit. These are functional and engineering results, not measured user-productivity gains or a WCAG certification.

## What We Learned
A productivity tool should make a return path explicit and protect that context when things go wrong. Native browser controls can support a compact, accessible interaction model, but automated tests cannot substitute for assistive-technology users and real-world research.

## What's Next
Interview students with varied access needs, test with screen-reader users, evaluate recovery tasks against an ordinary checklist, and expand the device matrix. Optional encrypted cross-device backup could be explored later. Those are future directions; there is no sync service or clinical feature in this prototype.

## Built With
JavaScript, HTML, CSS, localStorage, native browser dialogs, Node.js, JSDOM, axe-core, Prettier, Sites. Created as a new project during the Taskforge event with Codex assistance. Step decomposition and focus timers are established ideas; the original implementation centers on recovery checkpoints and defensive persistence. No other hackathon submission was copied.

## Demo Instructions
Run npm run dev and open the printed local URL. Select Explore a sample, mark the first step done and focus on the next one. Start the optional timer, choose Save my place, enter context and a precise next action, then save. Reload the page and choose Resume from here. Inspect reading settings, quick capture, and backup/restore. All demonstration notes are fictional.

Run npm ci, npm test and npm run check for the recorded automated checks. The application runtime itself has no package or API-key requirement.
