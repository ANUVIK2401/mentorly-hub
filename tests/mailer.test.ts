import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applicationReceivedMail, sendSafely, type Mailer } from "@/lib/mailer";

const mail = applicationReceivedMail({
  to: "a@example.edu",
  name: "Ada",
  projectTitle: "A Project",
  applicationId: "11111111-1111-4111-8111-111111111111",
});

describe("mailer", () => {
  it("links to the private status page and never includes the applicant's statement", () => {
    assert.match(mail.text, /\/application\/11111111-1111-4111-8111-111111111111/);
    assert.equal(mail.to, "a@example.edu");
    assert.ok(mail.subject.includes("A Project"));
  });

  it("delivers through the given transport once", async () => {
    const sent: string[] = [];
    const mailer: Mailer = { send: async (m) => void sent.push(m.to) };
    await sendSafely(mail, mailer);
    assert.deepEqual(sent, ["a@example.edu"]);
  });

  it("swallows a failing transport and logs no address", async () => {
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void logged.push(args);
    try {
      await assert.doesNotReject(sendSafely(mail, { send: async () => Promise.reject(new Error("smtp down")) }));
    } finally {
      console.error = original;
    }
    assert.equal(logged.length, 1);
    assert.ok(!JSON.stringify(logged).includes("a@example.edu"));
  });
});
