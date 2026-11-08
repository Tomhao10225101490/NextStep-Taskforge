import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { emptyState, createProject } from "../dist/model.js";
const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
let serial = 0;
const nativeSetInterval = globalThis.setInterval;
async function boot(t, stored) {
  const dom = new JSDOM(html, {
    url: "https://example.test",
    runScripts: "outside-only",
  });
  const { window } = dom;
  const intervals = [],
    callbacks = [];
  const original = nativeSetInterval;
  Object.assign(globalThis, {
    window,
    document: window.document,
    localStorage: window.localStorage,
  });
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
  if (stored !== undefined)
    localStorage.setItem(
      "nextstep.workspace.v1",
      typeof stored === "string" ? stored : JSON.stringify(stored),
    );
  globalThis.setInterval = (fn, ms) => {
    callbacks.push(fn);
    const id = original(fn, ms);
    intervals.push(id);
    return id;
  };
  await import("../dist/app.js?test=" + ++serial);
  t.after(() => {
    intervals.forEach(clearInterval);
    globalThis.setInterval = original;
    window.close();
  });
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent === text,
    );
  const submit = (id) =>
    document
      .querySelector(id)
      .dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
  return {
    dom,
    window,
    button,
    submit,
    tick: () => callbacks.forEach((fn) => fn()),
    read: () => JSON.parse(localStorage.getItem("nextstep.workspace.v1")),
  };
}
test("empty workspace does not silently populate fictional user data", async (t) => {
  const a = await boot(t);
  assert.match(document.body.textContent, /Make my first plan/);
  assert.equal(a.read(), null);
  a.button("Explore a sample").click();
  assert.equal(a.read().projects.length, 1);
  document.querySelector("#demo-button").click();
  assert.equal(a.read().projects.length, 1);
});
test("project input is rendered as text, never interpreted as HTML", async (t) => {
  const a = await boot(t);
  document.querySelector("#new-button").click();
  document.querySelector("#project-name").value =
    "<img src=x onerror=alert(1)>";
  document.querySelector("#project-steps").value =
    "<script>alert(1)</script>\nWrite a draft";
  a.submit("#project-form");
  assert.equal(
    document.querySelector("#workspace-title").textContent,
    "<img src=x onerror=alert(1)>",
  );
  assert.equal(document.querySelectorAll("img[src=x]").length, 0);
  assert.equal(a.read().projects[0].steps.length, 2);
});
test("checkpoint survives reload and resumes with the saved action visible", async (t) => {
  const a = await boot(t);
  a.button("Explore a sample").click();
  a.button("Start timer").click();
  a.button("Save my place").click();
  document.querySelector("#checkpoint-context").value = "Use source two";
  document.querySelector("#checkpoint-next").value = "Copy the citation";
  a.submit("#checkpoint-form");
  const saved = a.read();
  assert.equal(saved.projects[0].timer.runningSince, null);
  assert.equal(
    document.querySelector("#resume-heading").textContent,
    "Pick up where you left off.",
  );
  const b = await boot(t, saved);
  assert.match(document.body.textContent, /Copy the citation/);
  b.button("Resume from here").click();
  assert.ok(document.body.classList.contains("focus-view"));
  assert.match(
    document.querySelector(".breadcrumb").textContent,
    /Use source two/,
  );
});
test("completion has undo and keeps keyboard focus on the next step", async (t) => {
  const a = await boot(t);
  a.button("Explore a sample").click();
  a.button("Mark step done").click();
  assert.equal(a.read().projects[0].steps[0].done, true);
  assert.equal(document.activeElement.id, "focus-heading");
  a.button("Undo").click();
  assert.equal(a.read().projects[0].steps[0].done, false);
});
test("shortcuts do not intercept typing or open dialogs", async (t) => {
  const a = await boot(t);
  a.button("Explore a sample").click();
  const input = document.querySelector("#add-step-text");
  input.focus();
  input.dispatchEvent(
    new a.window.KeyboardEvent("keydown", { key: "n", bubbles: true }),
  );
  assert.equal(document.querySelector("dialog[open]"), null);
  document.body.dispatchEvent(
    new a.window.KeyboardEvent("keydown", { key: "f", bubbles: true }),
  );
  assert.ok(document.body.classList.contains("focus-view"));
  document.body.dispatchEvent(
    new a.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(document.body.classList.contains("focus-view"), false);
});
test("unreadable stored work is quarantined rather than overwritten", async (t) => {
  const a = await boot(t, "{broken");
  a.button("Explore a sample").click();
  assert.equal(localStorage.getItem("nextstep.workspace.v1"), "{broken");
  assert.equal(document.querySelector("#storage-warning").hidden, false);
});
test("contrast and reading size preferences persist", async (t) => {
  const a = await boot(t);
  const contrast = document.querySelector("#contrast-toggle");
  contrast.checked = true;
  contrast.dispatchEvent(new a.window.Event("change"));
  const large = document.querySelector("#large-toggle");
  large.checked = true;
  large.dispatchEvent(new a.window.Event("change"));
  assert.ok(document.documentElement.classList.contains("high-contrast"));
  assert.ok(document.documentElement.classList.contains("large-text"));
  assert.deepEqual(a.read().preferences, { contrast: true, largeText: true });
});
test("static semantic accessibility audit: no axe violations excluding layout-dependent color contrast", async (t) => {
  const a = await boot(t);
  a.dom.window.eval(axe.source);
  const result = await a.dom.window.axe.run(a.dom.window.document, {
    rules: { "color-contrast": { enabled: false } },
  });
  assert.equal(
    result.violations.length,
    0,
    JSON.stringify(
      result.violations.map((x) => ({ id: x.id, description: x.description })),
    ),
  );
});

test("timer expiration preserves unsaved text and never completes work", async (t) => {
  const s = emptyState();
  s.projects = [createProject("Brief", ["Open notes"])];
  s.activeId = s.projects[0].id;
  s.projects[0].timer = { remaining: 1, runningSince: Date.now() - 2000 };
  const a = await boot(t, s);
  const input = document.querySelector("#add-step-text");
  input.value = "Draft text that must survive";
  input.focus();
  a.tick();
  assert.equal(input.value, "Draft text that must survive");
  assert.equal(document.activeElement, input);
  assert.equal(a.read().projects[0].steps[0].done, false);
  assert.equal(a.read().projects[0].timer.runningSince, null);
});
test("another tab cannot be silently overwritten by this stale workspace", async (t) => {
  const a = await boot(t);
  a.button("Explore a sample").click();
  const other = emptyState();
  localStorage.setItem("nextstep.workspace.v1", JSON.stringify(other));
  window.dispatchEvent(
    new a.window.StorageEvent("storage", { key: "nextstep.workspace.v1" }),
  );
  a.button("Mark step done").click();
  assert.deepEqual(a.read(), other);
  assert.match(
    document.querySelector("#storage-warning").textContent,
    /another tab/,
  );
  assert.match(
    document.querySelector("#persistence-label").textContent,
    /not saved/,
  );
});
