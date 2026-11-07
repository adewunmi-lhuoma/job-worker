# Node.js Job Worker

A minimal, dependency-free worker that processes jobs sequentially and retries
failed jobs with capped exponential backoff.

## Run the example

```sh
npm start
```

## Use the worker

Pass an iterable or async iterable of jobs and an async handler to `runWorker`:

```js
const { runWorker } = require("./worker");

const stats = await runWorker(jobs, async (job) => {
  await processJob(job);
}, {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  onFailed: (job, error) => {
    console.error("Job permanently failed:", job, error);
  },
});
```

`maxAttempts` includes the first attempt. Delays double after each failure and
are capped at `maxDelayMs`. When a job exhausts its retries, `onFailed` is
called and the worker continues with the next job. `runWorker` resolves with
`{ succeeded, failed }` counts. A failure from `onFailed` stops the worker.

## Run tests

```sh
npm test
```
