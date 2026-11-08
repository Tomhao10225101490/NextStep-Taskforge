import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  createProject,
  currentStep,
  secondsLeft,
  toggleTimer,
  checkpoint,
  finishStep,
  validateBackup,
} from "../dist/model.js";
const make = () =>
  createProject(
    "Course brief",
    ["Choose a question", "Find two sources", "Write a draft"],
    "p",
    (() => {
      let n = 0;
      return () => `s${++n}`;
    })(),
  );
test("plans retain concrete step order and normalize blanks", () => {
  const p = createProject(" Plan ", ["  Open document  ", "", "Write outline"]);
  assert.equal(p.title, "Plan");
  assert.deepEqual(
    p.steps.map((x) => x.text),
    ["Open document", "Write outline"],
  );
  assert.equal(currentStep(p).text, "Open document");
});
test("empty or oversized plans are rejected", () => {
  for (const [title, steps] of [
    ["", ["a"]],
    ["x", []],
    ["x", [" "]],
    ["x", Array(51).fill("a")],
    ["x", ["a".repeat(501)]],
  ])
    assert.throws(() => createProject(title, steps));
});
test("timer uses elapsed wall clock time across reloads, clamps to zero", () => {
  assert.equal(secondsLeft({ remaining: 900, runningSince: 1000 }, 61000), 840);
  assert.equal(secondsLeft({ remaining: 60, runningSince: 1000 }, 100000), 0);
  assert.equal(secondsLeft({ remaining: 60, runningSince: 1000 }, 0), 60);
});
test("pause and resume preserve remaining seconds", () => {
  let p = make();
  p = toggleTimer(p, 1000);
  p = toggleTimer(p, 61000);
  assert.deepEqual(p.timer, { remaining: 840, runningSince: null });
  p = toggleTimer(p, 71000);
  assert.equal(secondsLeft(p.timer, 81000), 830);
});
test("saving a breadcrumb pauses timer and binds it to the planned step", () => {
  let p = toggleTimer(make(), 1000);
  p = checkpoint(p, " Two sources found ", "Copy the citation", 61000);
  assert.equal(p.checkpoint.context, "Two sources found");
  assert.equal(p.checkpoint.stepId, "s1");
  assert.equal(p.timer.runningSince, null);
  assert.equal(p.timer.remaining, 840);
  assert.equal(currentStep(p).text, "Choose a question");
});
test("a completed planned step clears its old checkpoint", () => {
  const p = finishStep(checkpoint(make(), "context", "open notes", 0));
  assert.equal(currentStep(p).id, "s2");
  assert.equal(p.checkpoint, null);
  assert.equal(p.timer.remaining, 900);
});
test("empty checkpoint actions and completed plans are rejected", () => {
  assert.throws(() => checkpoint(make(), "context", " "));
  let p = make();
  for (let i = 0; i < 3; i++) p = finishStep(p);
  assert.equal(currentStep(p), null);
  assert.throws(() => checkpoint(p, "", "Do something"));
  assert.deepEqual(finishStep(p), p);
});
test("backup round trip preserves checkpoints and preferences", () => {
  const s = emptyState();
  s.projects = [checkpoint(make(), "source two", "copy citation", 1000)];
  s.activeId = "p";
  s.preferences.contrast = true;
  const restored = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored, s);
});
test("invalid and malformed backups are rejected before mutation", () => {
  for (const invalid of [null, {}, { version: 99, projects: [], inbox: [] }])
    assert.throws(() => validateBackup(invalid));
  const s = emptyState();
  s.projects = [make()];
  s.activeId = "p";
  for (const mutate of [
    (p) => (p.steps[0].done = "yes"),
    (p) => (p.timer.remaining = -1),
    (p) => p.steps.push({ ...p.steps[0] }),
    (p) => (p.title = ""),
    (p) =>
      (p.checkpoint = {
        context: "",
        nextAction: "x",
        stepId: "missing",
        savedAt: new Date().toISOString(),
      }),
  ]) {
    const copy = structuredClone(s);
    mutate(copy.projects[0]);
    assert.throws(() => validateBackup(copy));
    assert.equal(s.projects[0].title, "Course brief");
  }
});
test("duplicate projects are rejected and unknown fields are not imported", () => {
  const s = emptyState();
  s.projects = [make()];
  s.activeId = "nonexistent";
  s.untrusted = "ignored";
  const validated = validateBackup(s);
  assert.equal(validated.activeId, "p");
  assert.equal(validated.untrusted, undefined);
  s.projects.push(make());
  assert.throws(() => validateBackup(s));
});
