import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APPLICATION_STATUSES } from "@/data/types";
import { applicationStatusEnum, projectStatusEnum, tagTypeEnum } from "@/db/schema";

/** Guards against the TypeScript types and the Postgres enums drifting apart. */
describe("schema parity", () => {
  it("application statuses match the database enum, in order", () => {
    assert.deepEqual([...applicationStatusEnum.enumValues], [...APPLICATION_STATUSES]);
  });
  it("project statuses and tag types match the domain types", () => {
    assert.deepEqual([...projectStatusEnum.enumValues], ["draft", "published", "archived"]);
    assert.deepEqual([...tagTypeEnum.enumValues], ["industry", "skill"]);
  });
});
