const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runWorker(jobs, handler, options = {}) {
  if (!jobs || (!jobs[Symbol.iterator] && !jobs[Symbol.asyncIterator])) {
    throw new TypeError("jobs must be an iterable or async iterable");
  }
  if (typeof handler !== "function") {
    throw new TypeError("handler must be a function");
  }

  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onFailed = (job, error) => {
      console.error(`Job failed after all retries:`, job, error);
    },
    wait = sleep,
  } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new RangeError("baseDelayMs must be a non-negative number");
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) {
    throw new RangeError("maxDelayMs must be a non-negative number");
  }
  if (typeof onFailed !== "function" || typeof wait !== "function") {
    throw new TypeError("onFailed and wait must be functions");
  }

  const stats = { succeeded: 0, failed: 0 };

  for await (const job of jobs) {
    let completed = false;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await handler(job);
        stats.succeeded += 1;
        completed = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = Math.min(
            baseDelayMs * 2 ** (attempt - 1),
            maxDelayMs,
          );
          await wait(delay);
        }
      }
    }

    if (!completed) {
      stats.failed += 1;
      await onFailed(job, lastError);
    }
  }

  return stats;
}

module.exports = { runWorker };

if (require.main === module) {
  const jobs = [
    { id: "email-1", attempts: 0 },
    { id: "email-2", attempts: 0 },
  ];

  runWorker(
    jobs,
    async (job) => {
      job.attempts += 1;
      console.log(`Processing ${job.id} (attempt ${job.attempts})`);

      if (job.id === "email-1" && job.attempts < 2) {
        throw new Error("Temporary example failure");
      }
    },
    {
      baseDelayMs: 500,
      onFailed: (job, error) => {
        console.error(`Giving up on ${job.id}: ${error.message}`);
      },
    },
  )
    .then((stats) => console.log("Worker finished:", stats))
    .catch((error) => {
      console.error("Worker stopped unexpectedly:", error);
      process.exitCode = 1;
    });
}
