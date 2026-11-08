/** Pure state transitions: no DOM, network, or hidden AI calls. */
export const VERSION = 1;
export const uid = () => globalThis.crypto.randomUUID();
export function emptyState() {
  return {
    version: VERSION,
    projects: [],
    activeId: null,
    inbox: [],
    preferences: { contrast: false, largeText: false },
    history: [],
  };
}
export function createProject(title, steps, id = uid(), idFactory = uid) {
  if (typeof title !== "string" || !title.trim() || title.length > 160)
    throw new Error("Name your project in 1–160 characters.");
  const clean = steps
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  if (!clean.length || clean.length > 50 || clean.some((s) => s.length > 500))
    throw new Error("Add 1–50 steps, each up to 500 characters.");
  return {
    id,
    title: title.trim(),
    steps: clean.map((text) => ({ id: idFactory(), text, done: false })),
    checkpoint: null,
    timer: { remaining: 900, runningSince: null },
    createdAt: new Date().toISOString(),
  };
}
export function currentStep(project) {
  return project?.steps.find((s) => !s.done) || null;
}
export function secondsLeft(timer, now = Date.now()) {
  return Math.max(
    0,
    timer.remaining -
      (timer.runningSince === null
        ? 0
        : Math.floor(Math.max(0, now - timer.runningSince) / 1000)),
  );
}
export function toggleTimer(project, now = Date.now()) {
  const remaining = secondsLeft(project.timer, now);
  return {
    ...project,
    timer: {
      remaining,
      runningSince:
        remaining === 0
          ? null
          : project.timer.runningSince === null
            ? now
            : null,
    },
  };
}
export function checkpoint(project, context, nextAction, now = Date.now()) {
  if (!nextAction.trim() || nextAction.length > 500 || context.length > 1200)
    throw new Error(
      "Write a next action (up to 500 characters); context may use up to 1,200.",
    );
  if (!currentStep(project))
    throw new Error("This project is already complete.");
  return {
    ...project,
    checkpoint: {
      context: context.trim(),
      nextAction: nextAction.trim(),
      stepId: currentStep(project).id,
      savedAt: new Date(now).toISOString(),
    },
    timer: { remaining: secondsLeft(project.timer, now), runningSince: null },
  };
}
export function finishStep(project) {
  const target = currentStep(project);
  if (!target) return project;
  return {
    ...project,
    steps: project.steps.map((s) =>
      s.id === target.id ? { ...s, done: true } : s,
    ),
    checkpoint: null,
    timer: { remaining: 900, runningSince: null },
  };
}
export function validateBackup(value) {
  if (
    !value ||
    value.version !== VERSION ||
    !Array.isArray(value.projects) ||
    value.projects.length > 100 ||
    !Array.isArray(value.inbox) ||
    value.inbox.length > 200
  )
    throw new Error("This is not a supported NextStep backup.");
  const ids = new Set();
  const projects = value.projects.map((p) => {
    if (
      typeof p.id !== "string" ||
      ids.has(p.id) ||
      typeof p.title !== "string" ||
      !p.title.trim() ||
      p.title.length > 160 ||
      !Array.isArray(p.steps) ||
      !p.steps.length ||
      p.steps.length > 50
    )
      throw new Error("Invalid project in backup.");
    ids.add(p.id);
    const stepIds = new Set();
    const steps = p.steps.map((s) => {
      if (
        typeof s.id !== "string" ||
        stepIds.has(s.id) ||
        typeof s.text !== "string" ||
        !s.text.trim() ||
        s.text.length > 500 ||
        typeof s.done !== "boolean"
      )
        throw new Error("Invalid step in backup.");
      stepIds.add(s.id);
      return { id: s.id, text: s.text, done: s.done };
    });
    const t = p.timer;
    if (
      !t ||
      !Number.isFinite(t.remaining) ||
      t.remaining < 0 ||
      t.remaining > 7200 ||
      (t.runningSince !== null &&
        (!Number.isFinite(t.runningSince) || t.runningSince < 0))
    )
      throw new Error("Invalid timer.");
    let saved = null;
    if (p.checkpoint) {
      const c = p.checkpoint;
      if (
        typeof c.context !== "string" ||
        c.context.length > 1200 ||
        typeof c.nextAction !== "string" ||
        !c.nextAction.trim() ||
        c.nextAction.length > 500 ||
        !steps.some((s) => s.id === c.stepId && !s.done) ||
        !Number.isFinite(Date.parse(c.savedAt))
      )
        throw new Error("Invalid checkpoint.");
      saved = {
        context: c.context,
        nextAction: c.nextAction,
        stepId: c.stepId,
        savedAt: c.savedAt,
      };
    }
    return {
      id: p.id,
      title: p.title,
      steps,
      checkpoint: saved,
      timer: { remaining: t.remaining, runningSince: t.runningSince },
      createdAt: typeof p.createdAt === "string" ? p.createdAt : "",
    };
  });
  const inbox = value.inbox.map((x) => {
    if (
      typeof x.id !== "string" ||
      typeof x.text !== "string" ||
      !x.text.trim() ||
      x.text.length > 500
    )
      throw new Error("Invalid capture.");
    return { id: x.id, text: x.text };
  });
  return {
    version: VERSION,
    projects,
    activeId: projects.some((p) => p.id === value.activeId)
      ? value.activeId
      : projects[0]?.id || null,
    inbox,
    preferences: {
      contrast: !!value.preferences?.contrast,
      largeText: !!value.preferences?.largeText,
    },
    history: [],
  };
}
export function sampleState() {
  const s = emptyState();
  s.projects = [
    createProject("Finish the climate policy brief", [
      "Choose one specific policy question",
      "Find two credible sources",
      "Write a rough three-paragraph argument",
      "Check citations and submit",
    ]),
  ];
  s.activeId = s.projects[0].id;
  s.inbox = [{ id: uid(), text: "Ask the seminar tutor about the word limit" }];
  return s;
}
