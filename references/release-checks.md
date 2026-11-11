# Release verification · 0.3.2-alpha.6

alpha.6 contains only engine-internal changes. In infinite repeat, when the round changes it reuses the last original first to reduce re-uploads, and the error-logging path was tidied. The prompt builder was changed to search combinations using axis values only. Output was confirmed byte-for-byte identical to alpha.5 on the 4 presets. The site DOM handling did not change, so the actual acceptance records below are from alpha.5.

## Distribution form

The whole `banana-loop` folder is the distribution unit. Deliver SKILL.md, assets, scripts and references together. Project images, plans and personal run logs are not put in the shared distribution. No ZIP install package or separate setup app is needed. Users start by reading `START_HERE.txt`.

This is an alpha release. Preparation to share this folder is complete, and it includes a README.md and .gitignore for the GitHub repository. Project images and run logs are not uploaded to the repository.

## Structure

| Class | Responsibility |
|---|---|
| DomResolver | Finds the current generation form, input, buttons and upload list |
| PromptEditor | Editor input and full-text confirmation |
| ReferenceManager | Connected files, keeping the original, deletion, attachment-complete check |
| UnlimitedControl | Checks the actual Unlimited switch |
| SubmissionMonitor | Queue, site errors and acceptance marker check |
| BrowserAdapter | Preparation and submission wiring for one request |
| BatchController | Order, stop, resume, shuffle and error logging |
| BatchPanel | Display, folder selection and user buttons |

All projects build the same engine. For DOM changes fix the lookup/attach classes; for order problems fix the controller. Do not develop separate per-project copies of the engine.

## Actually checked

2026-10-01, Windows / Chrome / English Higgsfield Image / Nano Banana Pro / 16:9 / 2K / 1 output / Unlimited.

- On an empty generation form, attached a connected local file, auto-selected it in the upload list, then closed it.
- Kept reference 03, then removed and replaced it with reference 04.
- alpha.5 sequential references: two originals; two requests on the first original and one request on the next original confirmed accepted. 0 unconfirmed.
- Test once on the first request, then Resume: the first request was not sent again.
- Keeping the same original 1 time and text-only generation with no reference 1 time confirmed accepted. 5 across the three modes in total, 0 unconfirmed. The test panel was left in the finished state, and infinite repeat was not run.

Generation on other actual browsers, operating systems, models and aspect ratios is unverified. Accepted means a new queued/generating item appeared on the screen; it does not guarantee final image quality or download.

## Local reproduction checks

Run from the skill folder. Users do not need to install or run these development checks.

```sh
node --test scripts/tests/runtime.test.cjs
python scripts/tests/tooling_test.py
node scripts/tests/browser.test.cjs
```

The last check runs in a development environment that has the Playwright package and installed Chrome. It is a local screen mock check that makes no requests to external services. The first two need no external packages.

- 28 run-state checks: duplicate clicks, stop timing, unconfirmed acceptance, resume after failure, folder change failure, shuffle that keeps groups, offline.
- 37 browser checks: three modes, four aspect ratios (16:9, 3:4, 9:16, 1:1), screen widths 700, 1024, 1250, 1920, hidden/duplicate/out-of-form inputs, upload list that opens and closes late, DOM replacement after reference removal, finished run code, saving the diagnostics file.
- 3 build-tool checks: building the three modes, preserving the existing output on invalid input, preventing name collisions and keeping extensions.

## Minimum actual check after a change

1. Prepare two test originals and a short prompt for each original.
2. On an empty form, Connect image folder -> Test once -> confirm accepted.
3. Resume -> same original kept -> next original swapped -> next acceptance confirmed.
4. Confirm stop/resume, automatic menu closing, and that the original model, ratio and number of outputs are kept.
5. Leave the diagnostics log and the actual observed scope, then update the delivered file with the same builder.

If the site has changed so that the upload or a button cannot be identified, leave the error and the current position. Do not solve it by clicking arbitrary buttons or unlimited resending. If only the acceptance marker is unconfirmed, record it as unconfirmed and move to the next item per the existing policy.
