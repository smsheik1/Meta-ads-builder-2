# Convex Free-Plan Quota Incident — 2026-08-31

## Impact

Convex disabled the production team after Wiggly exceeded the monthly free-plan function-call allowance. The public site could not load data until the monthly reset completed and the team was manually restored.

## Root cause

The Oracle render worker polled two idle queues every three seconds and sent a heartbeat every five seconds. With no traffic, that background loop alone could exceed the one-million-call monthly allowance. Production reached roughly 2.1 million calls even though the site had almost no external usage.

Storage had also reached 1.213 GiB. Most of the recoverable space came from 42 confirmed disposable generated outputs: 32 duplicate imported video-meme outputs and 10 old unshared, unsaved render outputs.

## Resolution

- Removed the 42 confirmed disposable storage objects, recovering about 394 MiB.
- Restored the Convex team after the monthly quota reset.
- Increased idle queue polling from 3 seconds to 30 seconds.
- Increased worker heartbeats from 5 seconds to 10 seconds.
- Added a regression test for those idle intervals.
- Made storage maintenance tolerate an already-missing storage object before deleting its dangling render-job row.
- Removed the 42 dangling render-job rows in small transactional batches.
- Redeployed and verified the web process, worker, `/`, `/discover`, and `/formats/fortnite-filter` in production.

## Prevention

The patched worker projects to about 432,000 idle Convex calls per 30-day month, leaving room under the free allowance for real traffic. Do not shorten the polling or heartbeat intervals without recalculating the monthly idle-call budget.

Before deleting generated storage:

1. Confirm the output is unshared and unsaved.
2. Delete through `storageMaintenance:deleteExpiredUnsharedRenders` so storage and database cleanup stay coordinated.
3. Use small batches to stay inside Convex's one-second mutation limit.
4. Recount `_storage`, `renderJobs`, and missing storage references after cleanup.

If Convex disables the team again:

1. Stop the render worker so it cannot keep retrying.
2. Check the team's usage state after the quota reset; a reset can leave the team in `Paused` until it is explicitly restored.
3. Restore the team, deploy the current `main`, and confirm both PM2 processes are online with no new worker errors.
4. Verify the public routes in a real browser before restarting any scheduled recovery monitor.
