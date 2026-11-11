# Per-project console script

Release stage: alpha `0.3.2-alpha.6`. The generated panel also shows the alpha version. The actual verification scope per feature follows this skill's SKILL.md. Do not present unverified features as verified.

## Flow

The agent makes the editable `_prompts.json` and builds a run file containing the engine, panel and prompts with the command below. Do not hand the user only the JSON or the engine source.

```sh
python scripts/build_console.py "project/_prompts.json" --reference manual --out "project/paste_into_console.js"
```

- `manual`: the user uploads 1 original to the site. The script keeps it and changes only the prompts. All slots must belong to the same reference group (e.g. stride 10, slots 1, 11, 21).
- `folder`: swaps the numbered images automatically. In the panel's Connect image folder, pick the folder that directly contains `01_name.png` and so on. The JSON is embedded in the code, so it need not be in the selected folder.
- `none`: text-only job with no photos. The user clears the site's existing reference.

Aspect ratio, model and number of outputs use the site settings as they are. Do not require changing to a specific aspect ratio. The default `aspect` metadata is `site` and is not an execution condition in the code. State a specific aspect ratio in the prompt only if the user asked. Do not say the script sets it automatically. Test once is 1 request, and the number of result images follows the site settings.

Default is Loop OFF and Shuffle OFF. Use the `--infinite` and `--shuffle` options only when endless repeat/random is explicitly requested. Jobs processed in folder order use Shuffle OFF.

## Panel and run state

Pasting the whole console code shows the project panel and the setup check is displayed automatically. There is no separate activation ON/OFF. Start or Test once starts the run immediately. If something is wrong with the input box, generate button, Unlimited or reference, the reason is shown before generating.

- Start/Resume: processes the prepared prompts. It does not resend requests confirmed accepted in the same session.
- Test once: requests the next prompt once.
- Stop/Close and stop: blocks the next request. It does not cancel generations already accepted. Starting again continues from the unprocessed items.
- Fold: folds only the panel and keeps the run going. You can move the panel by dragging its title.
- Loop OFF: processes only up to the current round. When ON, it keeps cycling until stopped.
- Shuffle: keeps the in-progress item and shuffles only the unsent items. When OFF, the unsent items return to their original order.
- Check setup: reads the readiness of the current screen without generating or changing settings.
- Log · diagnostics: provides error causes and Copy diagnostics. If the acceptance marker is not found, it is recorded as unconfirmed and the run moves on to the next item. There is no separate confirm button or lock.

Re-pasting the same code shows the existing controller again. When replacing it with a newer engine, if it is the same page, the same project data and a stopped state, the progress position and file connection are handed over. On data changes or reload this handover does not apply, so exclude combinations already processed from the new run list.

## Pre-delivery verification

Run `node --check "project/paste_into_console.js"` and `node scripts/verify.js assets/engine.js "project/_prompts.json"`. If the builder's input validation fails, the existing output is kept. Deliver one whole file as a link/attachment, and if the user wants a code block, provide a javascript block with nothing omitted.

Short usage guide: upload the original (manual only) -> F12 / Console -> paste the whole run code -> Enter -> Check setup -> Test once. If a paste-blocking warning appears, check the code, type `allow pasting` yourself and press Enter. Only folder mode connects an image folder. Unlimited is turned on at run time and, if the check fails, nothing is generated. Keep the tab open and turn off sleep.

## Structure and debugging

For the current verification environment, how to run the checks and the class responsibilities, see [release verification](release-checks.md). When attaching a file from the connected folder, wait for the menu to open and close and for the input to be recreated, and auto-select only the new upload card.

`assets/engine.js` separates DOM lookup (DomResolver), input (PromptEditor), references (ReferenceManager), Unlimited (UnlimitedControl), acceptance check (SubmissionMonitor), site connection (BrowserAdapter) and run state (BatchController) into classes. BatchPanel in `assets/console-panel.js` handles only display and user actions. When the site DOM changes, fix only the relevant class and run the regression tests for order, stop and duplicate prevention.

The site identifiers directly confirmed so far are `form#image-form`, `hf:tour-image-prompt` and `hf:image-form-submit`. Do not pick buttons by title alone or by arbitrary coordinates/colors. Even when child element text is attached, as in the Korean button `생성하기` ("Generate") followed by a number, tell them apart by the ID inside the form. The Unlimited label may sit on a higher wrapper rather than the switch's parent. Type into the Lexical input box with native edit events and verify the full text including line breaks.

Do not describe a local test success as real-site generation success. A new queued/generating marker must appear on the real screen to count as accepted; if no marker is found, record it as unconfirmed and move on to the next item. Do not count unconfirmed as success. Check actual image completion on the site.

Run the run-state regression tests with no external packages via `node --test scripts/tests/runtime.test.cjs`. They check Test once, duplicate clicks, stop/resume, uncertain acceptance, infinite/shuffle, and independence from aspect ratio.
