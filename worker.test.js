const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runWorker } = require("./worker");

test("retries a failed job and succeeds", async () => {
  let attempts = 0;
  const delays = [];

  const stats = await runWorker(
    [{ id: "retry-me" }],
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("temporary failure");
      }
    },
    {
      maxAttempts: 3,
      baseDelayMs: 10,
      wait: async (delay) => delays.push(delay),
    },
  );

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.deepEqual(stats, { succeeded: 1, failed: 0 });
});

test("marks a job failed after the retry limit and continues", async () => {
  const failedJobs = [];
  let nextJobProcessed = false;

  const stats = await runWorker(
    [{ id: "always-fails" }, { id: "next-job" }],
    async (job) => {
      if (job.id === "always-fails") {
        throw new Error("permanent failure");
      }
      nextJobProcessed = true;
    },
    {
      maxAttempts: 2,
      baseDelayMs: 0,
      onFailed: (job, error) => failedJobs.push([job.id, error.message]),
      wait: async () => {},
    },
  );

  assert.equal(nextJobProcessed, true);
  assert.deepEqual(failedJobs, [["always-fails", "permanent failure"]]);
  assert.deepEqual(stats, { succeeded: 1, failed: 1 });
});
