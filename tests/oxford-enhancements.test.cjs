const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../oxford-enhancements.js");

const Oxford = global.OxfordEnhancements;

test("addDays handles leap years and month boundaries", () => {
  assert.equal(Oxford.addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(Oxford.addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(Oxford.addDays("2026-12-31", 1), "2027-01-01");
});

test("mondayOf returns the Monday for each week", () => {
  assert.equal(Oxford.mondayOf("2026-11-23"), "2026-11-23");
  assert.equal(Oxford.mondayOf("2026-11-29"), "2026-11-23");
});

test("review intervals respond to recall quality", () => {
  assert.deepEqual(Oxford.nextReview(3, "again"), { stage: 0, intervalDays: 1 });
  assert.deepEqual(Oxford.nextReview(2, "hard"), { stage: 2, intervalDays: 2 });
  assert.deepEqual(Oxford.nextReview(0, "good"), { stage: 1, intervalDays: 3 });
  assert.deepEqual(Oxford.nextReview(0, "easy"), { stage: 2, intervalDays: 7 });
});

test("dueConcepts only returns concepts due today or earlier", () => {
  const concepts = [
    { topic: "A", dueDate: "2026-11-22" },
    { topic: "B", dueDate: "2026-11-23" },
    { topic: "C", dueDate: "2026-11-24" },
    { topic: "D", dueDate: "not-a-date" }
  ];
  assert.deepEqual(Oxford.dueConcepts(concepts, "2026-11-23").map(item => item.topic), ["A", "B"]);
});

test("adaptive guidance starts with a diagnostic when there is no history", () => {
  assert.equal(Oxford.getGuidance([], "english").kind, "diagnostic");
});

test("a fundamental error always triggers recovery before progression", () => {
  const sessions = [{ subject: "physics", date: "2026-11-23", score: 96, fundamentalErrors: 1 }];
  assert.equal(Oxford.getGuidance(sessions, "physics").kind, "foundation");
});

test("low scores trigger consolidation", () => {
  const sessions = [{ subject: "mathematics", date: "2026-11-23", score: 80, fundamentalErrors: 0 }];
  assert.equal(Oxford.getGuidance(sessions, "mathematics").kind, "consolidate");
});

test("one high result is confirmed before transfer", () => {
  const sessions = [{ subject: "engineering", date: "2026-11-23", score: 92, fundamentalErrors: 0 }];
  assert.equal(Oxford.getGuidance(sessions, "engineering").kind, "confirm");
});

test("two independent high results without fundamental errors permit transfer practice", () => {
  const sessions = [
    { subject: "english", date: "2026-11-22", score: 91, fundamentalErrors: 0 },
    { subject: "english", date: "2026-11-23", score: 94, fundamentalErrors: 0 }
  ];
  assert.equal(Oxford.getGuidance(sessions, "english").kind, "transfer");
});

test("unscored sessions do not pretend to prove mastery", () => {
  const sessions = [{ subject: "physics", date: "2026-11-23", score: null, fundamentalErrors: 0 }];
  assert.equal(Oxford.getGuidance(sessions, "physics").kind, "practice");
});
