import {
  emptyState,
  createProject,
  currentStep,
  secondsLeft,
  toggleTimer,
  checkpoint,
  finishStep,
  validateBackup,
  sampleState,
  uid,
} from "./model.js";
const $ = (s) => document.querySelector(s);
const STORAGE = "nextstep.workspace.v1";
let state = emptyState(),
  focus = false,
  undo = null,
  returnFocus = null,
  storageQuarantined = false,
  storageConflict = false;
function announce(message) {
  $("#announcer").textContent = message;
}
function warning(message) {
  $("#persistence-label").textContent = "Backup needed · not saved";
  $("#storage-warning").hidden = false;
  $("#storage-warning").textContent = message;
}
try {
  const stored = localStorage.getItem(STORAGE);
  if (stored) state = validateBackup(JSON.parse(stored));
} catch {
  storageQuarantined = true;
  warning(
    "Saved work could not be read. It has not been overwritten. Use Backup to restore a valid copy.",
  );
}
function save() {
  if (storageConflict) {
    warning(
      "This workspace changed in another tab. Download a backup of this tab before reloading; changes here have not overwritten the other tab.",
    );
    return false;
  }
  if (storageQuarantined) {
    warning(
      "The previous saved workspace is unreadable and has been preserved. Download your current work as a backup; use Restore to explicitly replace the saved workspace.",
    );
    return;
  }
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
    $("#storage-warning").hidden = true;
    $("#persistence-label").textContent = "Saved in this browser";
    return true;
  } catch {
    warning(
      "This browser could not save your changes. Keep this tab open and download a backup now.",
    );
  }
}
const project = () =>
  state.projects.find((p) => p.id === state.activeId) || null;
function replace(p) {
  state.projects = state.projects.map((x) => (x.id === p.id ? p : x));
  save();
}
function element(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text !== undefined) e.textContent = text;
  return e;
}
function button(text, action, kind = "secondary") {
  const e = element("button", { type: "button", class: kind }, text);
  e.addEventListener("click", action);
  return e;
}
function openDialog(id) {
  returnFocus = document.activeElement;
  $(id).showModal();
}
function closeDialog(dialog) {
  dialog.close();
  returnFocus?.focus();
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", () => closeDialog(dialog)));
  dialog.addEventListener("close", () => returnFocus?.focus());
}
function setFocus(value) {
  focus = value;
  render();
  const target = value ? $("#focus-heading") : $("#workspace-title");
  target?.setAttribute("tabindex", "-1");
  target?.focus();
}
function preferences() {
  document.documentElement.classList.toggle(
    "high-contrast",
    state.preferences.contrast,
  );
  document.documentElement.classList.toggle(
    "large-text",
    state.preferences.largeText,
  );
  $("#contrast-toggle").checked = state.preferences.contrast;
  $("#large-toggle").checked = state.preferences.largeText;
}
function render() {
  preferences();
  document.body.classList.toggle("focus-view", focus);
  const p = project();
  const list = $("#project-list");
  list.replaceChildren();
  for (const item of state.projects) {
    const b = button(
      "",
      () => {
        state.activeId = item.id;
        focus = false;
        undo = null;
        save();
        render();
        announce("Opened " + item.title);
      },
      "project-link",
    );
    b.setAttribute("aria-current", String(item.id === state.activeId));
    b.append(
      document.createTextNode(item.title),
      element(
        "small",
        {},
        `${item.steps.filter((s) => s.done).length} of ${item.steps.length} steps complete${item.checkpoint ? " · place saved" : ""}`,
      ),
    );
    list.append(b);
  }
  $("#capture-count").textContent = state.inbox.length;
  $("#workspace-title").textContent = p
    ? p.title
    : "Leave yourself a clear next step.";
  $("#workspace-description").textContent = p
    ? "A small plan. Room to focus. A way back when life interrupts."
    : "You don't need to hold the whole project in your head.";
  const root = $("#workspace");
  root.replaceChildren();
  if (!p) {
    const empty = element("section", {
      class: "empty-state",
      "aria-labelledby": "welcome-heading",
    });
    const copy = element("div");
    copy.append(
      element("p", { class: "eyebrow" }, "START WHERE YOU ARE"),
      element(
        "h2",
        { id: "welcome-heading" },
        "The whole project can wait. What comes first?",
      ),
      element(
        "p",
        {},
        "Make a few concrete steps. Work on one. When you need to leave, save a note for the person who returns: you.",
      ),
    );
    const actions = element("div", { class: "card-actions" });
    actions.append(
      button("Make my first plan", newPlan, "primary"),
      button("Explore a sample", loadDemo, "quiet"),
    );
    copy.append(actions);
    const art = element("div", {
      class: "illustration",
      "aria-label": "Example of a plan and a saved next action",
    });
    art.append(
      element("div", { class: "paper-note" }, "Finish the policy brief"),
      element(
        "div",
        { class: "paper-note highlight" },
        "Next: choose one question",
      ),
      element(
        "div",
        { class: "paper-note" },
        "Coming back? Your notes will be here.",
      ),
    );
    empty.append(copy, art);
    root.append(empty);
    return;
  }
  if (focus) {
    const bar = element("div", { class: "focus-bar" });
    bar.append(
      button("← Back to my plan", () => setFocus(false), "quiet"),
      element("p", {}, "One step is enough for now."),
    );
    root.append(bar);
  }
  if (p.checkpoint && !focus) {
    const c = element("section", {
      class: "checkpoint",
      "aria-labelledby": "resume-heading",
    });
    c.append(
      element("p", { class: "eyebrow" }, "YOU LEFT YOURSELF A WAY BACK"),
      element("h2", { id: "resume-heading" }, "Pick up where you left off."),
    );
    if (p.checkpoint.context)
      c.append(element("p", { class: "saved-context" }, p.checkpoint.context));
    c.append(
      element(
        "p",
        { class: "next-action" },
        "Next action: " + p.checkpoint.nextAction,
      ),
      button(
        "Resume from here",
        () => {
          setFocus(true);
          announce("Resuming your saved step.");
        },
        "primary",
      ),
    );
    root.append(c);
  }
  const grid = element("div", { class: "work-grid" });
  const area = element("section");
  const step = currentStep(p);
  if (step) {
    const card = element("section", {
      class: "action-card",
      "aria-labelledby": "focus-heading",
    });
    const eyebrow = element("p", { class: "eyebrow" });
    eyebrow.append(
      document.createTextNode("YOUR NEXT STEP"),
      element(
        "span",
        {},
        `${p.steps.filter((s) => s.done).length + 1} / ${p.steps.length}`,
      ),
    );
    card.append(
      eyebrow,
      element(
        focus ? "h1" : "h2",
        { class: "step-title", id: "focus-heading", tabindex: "-1" },
        step.text,
      ),
    );
    if (p.checkpoint && focus) {
      const crumb = element("div", { class: "breadcrumb" });
      crumb.append(
        element("strong", {}, "Your saved next action"),
        document.createTextNode(p.checkpoint.nextAction),
      );
      if (p.checkpoint.context)
        crumb.append(element("p", {}, p.checkpoint.context));
      card.append(crumb);
    }
    const timer = element("div", { class: "timer-row" });
    timer.append(
      element(
        "span",
        {
          id: "timer-display",
          class: "timer-digits",
          "aria-label": "Time remaining",
        },
        formatTime(secondsLeft(p.timer)),
      ),
      button(
        p.timer.runningSince === null ? "Start timer" : "Pause timer",
        () => {
          replace(toggleTimer(project()));
          render();
          announce(
            project().timer.runningSince === null
              ? "Timer paused."
              : "Timer started.",
          );
        },
        "secondary",
      ),
    );
    const duration = element("select", { "aria-label": "Reset timer to" });
    for (const minutes of [5, 15, 25]) {
      const o = element("option", { value: minutes }, minutes + " min");
      if (
        minutes ===
        (p.timer.remaining <= 300 ? 5 : p.timer.remaining <= 900 ? 15 : 25)
      )
        o.selected = true;
      duration.append(o);
    }
    duration.disabled = p.timer.runningSince !== null;
    duration.addEventListener("change", () => {
      replace({
        ...project(),
        timer: { remaining: Number(duration.value) * 60, runningSince: null },
      });
      render();
      announce("Timer reset.");
    });
    timer.append(duration);
    card.append(
      timer,
      element(
        "p",
        { class: "timer-note" },
        "Optional. No alarm, no pressure. Finish the step when you are ready.",
      ),
    );
    const actions = element("div", { class: "card-actions" });
    actions.append(
      button(
        "Mark step done",
        () => {
          undo = structuredClone(project());
          replace(finishStep(project()));
          render();
          announce(
            "Step completed. " +
              (currentStep(project())
                ? "Next step: " + currentStep(project()).text
                : "All planned steps are complete."),
          );
          $("#focus-heading")?.focus();
        },
        "primary",
      ),
    );
    if (!focus)
      actions.append(
        button("Focus on this step", () => setFocus(true), "quiet"),
      );
    card.append(actions);
    area.append(card);
    const away = element("div", { class: "save-place" });
    away.append(
      button("Save my place", savePlace, "secondary"),
      element(
        "p",
        {},
        "Need to step away? Leave one clear action for when you return.",
      ),
    );
    area.append(away);
  } else {
    const done = element("section", { class: "action-card" });
    done.append(
      element("div", { class: "complete-mark", "aria-hidden": "true" }, "✓"),
      element("h2", {}, "The plan is complete."),
      element(
        "p",
        { class: "lede" },
        "Take a breath. You can add another step, or leave it here.",
      ),
      button("Back to the plan", () => setFocus(false), "secondary"),
    );
    area.append(done);
  }
  if (undo) {
    const row = element("div", { class: "undo-row" });
    row.append(
      document.createTextNode("A step was marked done."),
      button(
        "Undo",
        () => {
          replace(undo);
          undo = null;
          render();
          announce("Step completion undone.");
        },
        "quiet",
      ),
    );
    area.append(row);
  }
  const plan = element("section", {
    class: "plan-panel",
    "aria-labelledby": "plan-heading",
  });
  const head = element("div", { class: "plan-heading" });
  head.append(
    element("h2", { id: "plan-heading" }, "The rest of your plan"),
    element(
      "small",
      {},
      `${p.steps.filter((s) => s.done).length} / ${p.steps.length}`,
    ),
  );
  plan.append(head);
  const progress = element("div", {
    class: "plan-progress",
    role: "progressbar",
    "aria-label": "Project steps complete",
    "aria-valuemin": 0,
    "aria-valuemax": p.steps.length,
    "aria-valuenow": p.steps.filter((s) => s.done).length,
  });
  const fill = element("span");
  fill.style.width =
    (p.steps.filter((s) => s.done).length / p.steps.length) * 100 + "%";
  progress.append(fill);
  plan.append(progress);
  const steps = element("ol", { class: "step-list" });
  for (const s of p.steps) {
    const row = element("li", {
      class:
        "step-item" +
        (s.done ? " done" : "") +
        (s.id === step?.id ? " current" : ""),
    });
    const cb = element("input", {
      type: "checkbox",
      "data-step-id": s.id,
      "aria-label": "Mark " + s.text + (s.done ? " not done" : " done"),
    });
    cb.checked = s.done;
    cb.addEventListener("change", () => {
      undo = structuredClone(project());
      const updated = {
        ...project(),
        steps: project().steps.map((x) =>
          x.id === s.id ? { ...x, done: cb.checked } : x,
        ),
        checkpoint: null,
        timer: { remaining: 900, runningSince: null },
      };
      replace(updated);
      render();
      [...document.querySelectorAll(".step-item input")]
        .find((cb) => cb.getAttribute("data-step-id") === s.id)
        ?.focus();
      announce("Plan updated.");
    });
    row.append(cb, element("span", { class: "step-text" }, s.text));
    const edit = button(
      "Edit",
      () => {
        const text = prompt("Edit this step", s.text);
        if (text === null) return;
        if (!text.trim() || text.length > 500) {
          announce("Step must be 1–500 characters.");
          return;
        }
        replace({
          ...project(),
          steps: project().steps.map((x) =>
            x.id === s.id ? { ...x, text: text.trim() } : x,
          ),
        });
        render();
      },
      "quiet",
    );
    edit.setAttribute("aria-label", "Edit step: " + s.text);
    row.append(edit);
    steps.append(row);
  }
  plan.append(steps);
  const form = element("form", { class: "add-step" });
  const input = element("input", {
    id: "add-step-text",
    required: "",
    maxlength: 500,
    placeholder: "e.g. Check the word limit",
  });
  form.append(
    element("label", { for: "add-step-text" }, "Add a concrete next step"),
    input,
  );
  const submit = element(
    "button",
    { type: "submit", class: "secondary" },
    "Add step",
  );
  form.append(submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (project().steps.length >= 50) {
      announce(
        "This plan already has 50 steps. Create a smaller separate plan.",
      );
      return;
    }
    const text = input.value.trim();
    if (!text) return;
    replace({
      ...project(),
      steps: [...project().steps, { id: uid(), text, done: false }],
    });
    render();
    announce("Step added.");
    $("#add-step-text")?.focus();
  });
  plan.append(form);
  grid.append(area, plan);
  root.append(grid);
}
function formatTime(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
function newPlan() {
  $("#project-form").reset();
  $("#project-error").textContent = "";
  openDialog("#project-dialog");
}
function loadDemo() {
  if (state.projects.length) {
    announce(
      "The sample was not loaded because your workspace already has projects. Your work is unchanged.",
    );
    return;
  }
  state = sampleState();
  save();
  render();
  announce("Sample project loaded. These are fictional demonstration notes.");
}
function savePlace() {
  const p = project();
  if (!currentStep(p)) return;
  $("#checkpoint-context").value = p.checkpoint?.context || "";
  $("#checkpoint-next").value = p.checkpoint?.nextAction || "";
  $("#checkpoint-error").textContent = "";
  openDialog("#checkpoint-dialog");
}
$("#new-button").onclick = newPlan;
$("#demo-button").onclick = loadDemo;
$("#project-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    if (state.projects.length >= 100)
      throw new Error(
        "This workspace already has 100 projects. Keep a backup and use a smaller workspace.",
      );
    const p = createProject(
      $("#project-name").value,
      $("#project-steps").value.split("\n"),
    );
    state.projects.push(p);
    state.activeId = p.id;
    focus = false;
    undo = null;
    save();
    closeDialog($("#project-dialog"));
    render();
    announce("Plan created. Next step: " + currentStep(p).text);
  } catch (error) {
    $("#project-error").textContent = error.message;
  }
};
$("#checkpoint-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    replace(
      checkpoint(
        project(),
        $("#checkpoint-context").value,
        $("#checkpoint-next").value,
      ),
    );
    closeDialog($("#checkpoint-dialog"));
    focus = false;
    render();
    announce("Your place is saved. The timer is paused.");
    $("#resume-heading")?.setAttribute("tabindex", "-1");
    $("#resume-heading")?.focus();
  } catch (error) {
    $("#checkpoint-error").textContent = error.message;
  }
};
$("#help-button").onclick = () => openDialog("#help-dialog");
$("#settings-button").onclick = () => openDialog("#settings-dialog");
$("#backup-button").onclick = () => {
  $("#backup-result").textContent = "";
  openDialog("#backup-dialog");
};
for (const [id, key] of [
  ["#contrast-toggle", "contrast"],
  ["#large-toggle", "largeText"],
])
  $(id).onchange = (e) => {
    state.preferences[key] = e.target.checked;
    save();
    preferences();
  };
$("#inbox-button").onclick = () => {
  renderCaptures();
  openDialog("#capture-dialog");
};
function renderCaptures() {
  const root = $("#capture-items");
  root.replaceChildren();
  if (!state.inbox.length)
    root.append(element("p", { class: "hint" }, "No parked thoughts."));
  for (const item of state.inbox) {
    const row = element("div", { class: "capture-item" });
    const remove = button(
      "Remove",
      () => {
        state.inbox = state.inbox.filter((x) => x.id !== item.id);
        save();
        renderCaptures();
        $("#capture-count").textContent = state.inbox.length;
        announce("Captured thought removed.");
      },
      "quiet",
    );
    remove.setAttribute("aria-label", "Remove captured thought: " + item.text);
    row.append(element("span", {}, item.text), remove);
    root.append(row);
  }
}
$("#capture-form").onsubmit = (e) => {
  e.preventDefault();
  const text = $("#capture-text").value.trim();
  if (!text) return;
  if (state.inbox.length >= 200) {
    announce("Your capture list is full. Remove an item first.");
    return;
  }
  state.inbox.push({ id: uid(), text });
  save();
  $("#capture-form").reset();
  renderCaptures();
  $("#capture-count").textContent = state.inbox.length;
  $("#capture-text").focus();
  announce("Thought saved. Your active step is unchanged.");
};
$("#export-button").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = element("a", { href: url, download: "nextstep-backup.json" });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("#backup-result").textContent =
    "Backup downloaded. Keep it somewhere you trust.";
};
$("#import-button").onclick = async () => {
  const file = $("#import-file").files[0];
  const result = $("#backup-result");
  if (!file || !$("#replace-confirm").checked) {
    result.textContent = "Choose a JSON file and confirm replacement first.";
    return;
  }
  if (file.size > 1000000) {
    result.textContent = "Backup is too large. Maximum size is 1 MB.";
    return;
  }
  try {
    const restored = validateBackup(JSON.parse(await file.text()));
    state = restored;
    storageQuarantined = false;
    storageConflict = false;
    focus = false;
    undo = null;
    save();
    render();
    result.textContent = "Backup restored. Your workspace has been replaced.";
    $("#replace-confirm").checked = false;
    announce("Backup restored.");
  } catch (error) {
    result.textContent =
      error.message + " Your current work has not been changed.";
  }
};
document.addEventListener("keydown", (e) => {
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    document.querySelector("dialog[open]") ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) ||
    e.target.isContentEditable
  )
    return;
  if (e.key.toLowerCase() === "n") {
    e.preventDefault();
    newPlan();
  } else if (e.key.toLowerCase() === "f" && currentStep(project())) {
    e.preventDefault();
    setFocus(true);
  } else if (e.key === "Escape" && focus) {
    setFocus(false);
  }
});
let timerFinishedFor = null;
setInterval(() => {
  const p = project();
  if (!p) return;
  const left = secondsLeft(p.timer);
  const display = $("#timer-display");
  if (display) display.textContent = formatTime(left);
  if (
    left === 0 &&
    p.timer.runningSince !== null &&
    timerFinishedFor !== p.id
  ) {
    timerFinishedFor = p.id;
    replace({ ...p, timer: { remaining: 0, runningSince: null } });
    const toggle = document.querySelector(".timer-row button");
    if (toggle) toggle.textContent = "Start timer";
    const duration = document.querySelector(".timer-row select");
    if (duration) duration.disabled = false;
    announce(
      "Your focus time is complete. Nothing has been marked done. Take a break or reset the timer.",
    );
  }
  if (left > 0) timerFinishedFor = null;
}, 500);
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE) {
    storageConflict = true;
    warning(
      "This workspace changed in another tab. Export a backup before reloading. This tab will not overwrite those changes.",
    );
  }
});
render();
