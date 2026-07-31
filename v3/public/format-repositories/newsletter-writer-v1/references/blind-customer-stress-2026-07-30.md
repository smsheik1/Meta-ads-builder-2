# Blind Customer Stress Test

Date: 2026-07-30

## Method

- Froze the live v1.1.0 ZIP at SHA-256
  `7b5d44a216b5c33db25ed17923cdff32c2230c554d561ad8658dbe560df1d835`.
- Used separate fresh Codex agents for the customer and the package runner.
- Gave runners only the downloadable package and the customer's opening message.
- Made no paid image, video, voice, rendering, or Wiggly provider calls.
- Asked each customer agent to judge the final newsletter before a scenario
  could pass.

## Scenarios

| Scenario | Baseline | v1.1.1 | What changed |
| --- | --- | --- | --- |
| FinalStraw origin story | Fail | Pass | Requested human origin became the narrative spine; repeated metaphor removed. |
| Holden family business | Fail | Pass | Agent asked for one concrete customer example instead of treating `family-owned` as proof. |
| Brightmark with offered samples | Fail | Pass | Agent requested and used the customer's files; bundled fixtures were blocked from customer runs. |
| No-website workshop | Fail | Pass | Missing date stopped drafting; simple facts-only announcements used the short path. |
| Unsafe PeakWell page export | Fail | Pass | Existing injection and risky-claim protection remained intact; repetitive preparation copy was removed. |
| Interrupted run, new agent | Fail | Pass | The new agent reacquired the current brief and produced concise copy without losing saved brand facts. |

## Evidence-Backed Fixes

1. Bundled fixtures, goldens, and comparisons are test-only and cannot be
   imported as customer samples, even after being copied outside the package.
2. A website is recommended, not required.
3. Resume at `profile-ready` always asks for the current newsletter topic.
4. Missing action-critical details block drafting unless the user approves a
   teaser or waitlist.
5. Requested human differences require a concrete example.
6. Sparse facts-only announcements default to 50-240 words, two or three body
   paragraphs, and a direct reader invitation.
7. Draft and review prompts remove repeated claims, tautologies, and unsupported
   clever abstractions.

## Result

All six final reruns passed customer review. This proves the packaged workflow
inside Codex; it does not claim a separate Claude or Cursor execution.

## Ground-Up Contract Audit

After the six scenario reruns passed, direct validator probes found four edge
cases the scenarios had not exercised:

- A company with only one grounded source could not complete its voice profile.
- A short topic such as `Why us` failed lexical topic matching even when the
  newsletter was relevant.
- A generated profile could change the company name or website.
- A generated CTA could introduce a URL that was not in the approved brief.

The runner now handles one-source profiles honestly, skips unreliable lexical
matching for topics with no meaningful terms, locks profile identity to the
source record, and requires the CTA URL to match the brief exactly. Each case
has a focused regression test, and the rebuilt ZIP passes its own test suite.
