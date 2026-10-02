import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applicationKey, deriveCohortStatus, occupiesSeat, resolveStatusChange } from "@/lib/rules";

const cohort = { maxStudents: 10, applicationDeadline: "2026-10-10", endDate: "2026-12-15" };

describe("deriveCohortStatus", () => {
  it("is open before the deadline with seats left", () => {
    assert.equal(deriveCohortStatus(cohort, 3, new Date("2026-10-01T12:00:00Z")), "open");
  });
  it("keeps the deadline day itself open", () => {
    assert.equal(deriveCohortStatus(cohort, 3, new Date("2026-10-10T23:00:00Z")), "open");
  });
  it("is closed the day after the deadline", () => {
    assert.equal(deriveCohortStatus(cohort, 3, new Date("2026-10-11T00:30:00Z")), "closed");
  });
  it("is full when seats are taken, even before the deadline", () => {
    assert.equal(deriveCohortStatus(cohort, 10, new Date("2026-10-01T12:00:00Z")), "full");
  });
  it("is completed after the end date regardless of seats", () => {
    assert.equal(deriveCohortStatus(cohort, 10, new Date("2027-01-01T00:00:00Z")), "completed");
  });
});

describe("resolveStatusChange", () => {
  it("accepts when a seat is free", () => {
    const r = resolveStatusChange({ current: "submitted", requested: "accepted", seatsTaken: 9, maxStudents: 10 });
    assert.deepEqual(r, { status: "accepted", waitlistedBecauseFull: false });
  });
  it("turns an accept into a waitlist entry when the cohort is full", () => {
    const r = resolveStatusChange({ current: "under_review", requested: "accepted", seatsTaken: 10, maxStudents: 10 });
    assert.deepEqual(r, { status: "waitlisted", waitlistedBecauseFull: true });
  });
  it("does not consume a second seat when moving accepted to enrolled", () => {
    const r = resolveStatusChange({ current: "accepted", requested: "enrolled", seatsTaken: 10, maxStudents: 10 });
    assert.deepEqual(r, { status: "enrolled", waitlistedBecauseFull: false });
  });
  it("lets rejection and withdrawal through when full", () => {
    for (const requested of ["rejected", "withdrawn", "waitlisted"] as const) {
      const r = resolveStatusChange({ current: "submitted", requested, seatsTaken: 10, maxStudents: 10 });
      assert.equal(r.status, requested);
    }
  });
});

describe("helpers", () => {
  it("only accepted and enrolled occupy seats", () => {
    assert.equal(occupiesSeat("accepted"), true);
    assert.equal(occupiesSeat("enrolled"), true);
    assert.equal(occupiesSeat("waitlisted"), false);
    assert.equal(occupiesSeat("submitted"), false);
  });
  it("normalises the duplicate key by case and whitespace", () => {
    assert.equal(applicationKey("c1", "  Ada@Example.EDU "), applicationKey("c1", "ada@example.edu"));
    assert.notEqual(applicationKey("c1", "a@x.edu"), applicationKey("c2", "a@x.edu"));
  });
});
