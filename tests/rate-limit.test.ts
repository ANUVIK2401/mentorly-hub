import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter } from "@/lib/rate-limit";

const RULE = { name: "t", max: 3, windowMs: 1000 };

describe("rate limiter", () => {
  it("allows up to max hits per window, then refuses with a retry time", () => {
    let t = 0;
    const rl = createRateLimiter(() => t);
    for (let i = 0; i < 3; i++) assert.ok(rl.hit("a", RULE).allowed);
    t = 400;
    const blocked = rl.hit("a", RULE);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
  });

  it("starts a fresh window once the old one expires", () => {
    let t = 0;
    const rl = createRateLimiter(() => t);
    for (let i = 0; i < 4; i++) rl.hit("a", RULE);
    t = 1000;
    assert.ok(rl.hit("a", RULE).allowed);
  });

  it("keeps clients and rules separate", () => {
    const rl = createRateLimiter(() => 0);
    for (let i = 0; i < 4; i++) rl.hit("a", RULE);
    assert.ok(rl.hit("b", RULE).allowed);
    assert.ok(rl.hit("a", { ...RULE, name: "other" }).allowed);
  });

  it("a sweep triggered by a short-window rule does not reset a long-window counter", () => {
    let t = 0;
    const rl = createRateLimiter(() => t);
    const long = { name: "long", max: 1, windowMs: 600_000 };
    rl.hit("victim", long);
    for (let i = 0; i < 5100; i++) rl.hit(`k${i}`, { name: "short", max: 5, windowMs: 1000 });
    t = 2000; // past the short window, well inside the long one
    rl.hit("trigger", { name: "short", max: 5, windowMs: 1000 }); // a new short-window entry runs the sweep
    assert.equal(rl.hit("victim", long).allowed, false);
  });
});
