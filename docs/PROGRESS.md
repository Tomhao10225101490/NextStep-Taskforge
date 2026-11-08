# NextStep / Taskforge progress

Started November 8, 2026 in a new Taskforge-NextStep directory. QuantumNoise-Lab is not modified.

Official brief: https://taskforge.devpost.com/ — accessible productivity tools, original working prototype, complete Devpost story, demo/walkthrough, code/build instructions, disclose pre-existing work and AI assistance. Deadline November 24, 2026 17:00 EST = November 25 06:00 Asia/Shanghai. Event starts October 17, 2026; this new implementation is within the event period.

Chosen user scenario: a hypothetical university student returning to coursework after interruptions. No real interviews, participant study, diagnosis, productivity outcomes, or accessibility certification are claimed.

Implementation: static browser app in dist/, pure domain model in dist/model.js, UI in dist/app.js, responsive stylesheet. Browser-local persistence, concrete steps, single-step focus, optional wall-clock timer, interruption breadcrumb + exact next action, capture inbox, explicit backup/restore, contrast/text settings, accessible native dialogs and keyboard shortcuts. No AI endpoint, account, external font, analytics or private API key is used by the app.

Current local preview: http://127.0.0.1:8510 (node server.js, retained exec session 14150). Initial IAB tab created (NextStep). Sites registration created ONCE: project_id appgprj_6af0167279e88191b4bac218942dda54; manifest is .openai/hosting.json; expected origin https://nextstep-taskforge-2026.electalder.chatgpt.site. This is not yet a verified deployment. Site starts private. Credential is only in functions store nextstep_site, never written to disk; refresh credential for same project if expired, do not create again.

Tests: Node model and JSDOM UI/axe semantic tests written. First npm install hit existing root-owned global npm cache; switched to project-local .cache/npm rather than altering user cache. npm install is currently running in exec session 88891. Initial test output had missing jsdom because install had not completed; rerun after install. No tests were deleted. Need inspect UI tests and resolve failures.

Recent fixes awaiting validation: keyboard focus after completion, timer expiration does not re-render or erase typed add-step text, unreadable storage quarantined, multi-tab stale writes blocked, project count capped consistently with restore validation, visible save warning changes persistence label.

Remaining: finish tests, real browser keyboard/reload/backup checks, visual QA desktop and narrow layouts; README/provenance/accessibility limits and Devpost text; prepare 2–3 minute demo from actual UI captures; GitHub repo/public code; package Sites exact pushed source and deploy (preserve private audience unless user requests public access); complete Taskforge draft through user's authenticated local Chrome. Native Chrome is already signed into Devpost and YouTube (@QuantumNoiseLabQFF2026), with user-created channel. Use CUA only for UI. In earlier task user manually handled Cloudflare and terms. Prepare everything before requesting final participant terms agreement and Submit project, which must be handed to user. Do not reuse the quantum project entry.

## Verified milestone

20 Node/JSDOM tests pass (including scoped axe audit; color-contrast excluded). Earlier missing-package failure was resolved with project-local npm cache. Cross-realm empty-array assertion in the semantic audit was corrected to assert the actual violation count; the audit itself returned no violations. Real browser verified checkpoint reload/resume, keyboard F/Escape, reading settings, actual backup download and file-chooser restore. Screenshot captures are in demo/captures and fictional downloaded JSON in results/browser-backup.json. Timer selector label now says Reset timer to and retains a sensible reset selection while paused/running. Focus mode exposes its active step as H1. Code formatted with Prettier. README, Devpost text, verification scope and English demo narration are written. Site source packaging/deployment and public GitHub repo still pending; demo video still to render/upload.
