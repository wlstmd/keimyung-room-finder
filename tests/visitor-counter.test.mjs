import assert from "node:assert/strict";
import test from "node:test";
import { getSeoulDate, incrementPageView } from "../visitor-counter.mjs";

function createConfigMap({ date, today, total, resourceVersion = "1" }) {
  return {
    metadata: {
      name: "visitor-counts",
      namespace: "kmu-room-finder",
      resourceVersion,
    },
    data: { date, today: String(today), total: String(total) },
  };
}

test("uses the Seoul calendar date across UTC midnight", () => {
  assert.equal(getSeoulDate(new Date("2026-11-27T14:59:00.000Z")), "2026-11-27");
  assert.equal(getSeoulDate(new Date("2026-11-27T15:00:00.000Z")), "2026-11-28");
});

test("increments today's and total page views", async () => {
  let saved;
  const result = await incrementPageView(
    {
      get: async () => createConfigMap({ date: "2026-11-28", today: 12, total: 40 }),
      update: async (configMap) => {
        saved = configMap;
      },
    },
    new Date("2026-11-27T15:00:00.000Z"),
  );

  assert.deepEqual(result, { today: 13, total: 41 });
  assert.deepEqual(saved.data, { date: "2026-11-28", today: "13", total: "41" });
});

test("resets today's count when the Seoul date changes", async () => {
  let saved;
  const result = await incrementPageView(
    {
      get: async () => createConfigMap({ date: "2026-11-27", today: 12, total: 40 }),
      update: async (configMap) => {
        saved = configMap;
      },
    },
    new Date("2026-11-27T15:00:00.000Z"),
  );

  assert.deepEqual(result, { today: 1, total: 41 });
  assert.equal(saved.data.date, "2026-11-28");
});

test("retries resource-version conflicts without losing a concurrent page view", async () => {
  let current = createConfigMap({ date: "2026-11-28", today: 2, total: 8 });
  let updateCount = 0;
  const result = await incrementPageView(
    {
      get: async () => current,
      update: async (configMap) => {
        updateCount += 1;
        if (updateCount === 1) {
          current = createConfigMap({
            date: "2026-11-28",
            today: 3,
            total: 9,
            resourceVersion: "2",
          });
          const error = new Error("conflict");
          error.statusCode = 409;
          throw error;
        }
        current = configMap;
      },
    },
    new Date("2026-11-27T15:00:00.000Z"),
  );

  assert.deepEqual(result, { today: 4, total: 10 });
  assert.equal(updateCount, 2);
});
