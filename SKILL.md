---
name: banana-loop
description: >-
  Builds a console script with embedded prompts that repeats image generation
  on Higgsfield. Use it for text-only generation, several variants of the same
  original, swapping reference images in numbered order, and sorting a
  reference folder. Supports general image work such as characters, logos,
  products, backgrounds and spaces; video generation is excluded.
metadata:
  version: "0.3.2-alpha.6"
  release_stage: "alpha"
---

# Banana Loop

Reply to the user in the language they write in.

The user entry point is [Quick Start](START_HERE.txt). Do not make a first-time user read all the internal docs; follow the onboarding principles below and the [agent workflow guide](references/agent-workflow.md), and guide only the step needed now.

If the user asks what to write in chat, or needs a ready-made example, pick the one matching situation from the [copy-paste request examples](REQUEST_EXAMPLES.txt). Do not list all the examples in one reply.

## Guiding first-time users

- When you receive the skill, images or a synopsis, first read whatever material you can access, then give 3-5 sentences: **material summary -> recommended generation method -> next step**. Before you have read something, say you will check it; never say you checked material you could not read. Do not dump install instructions, a full diagnostic table or long code in the first reply. For a concrete example, follow the [first-reply template](references/agent-workflow.md).
- In guidance, call the generation methods **① text only ② one reference ③ reference folder (in order)**. When the user describes the result, the agent picks the matching method. If there are several images but the user names only one, it is ②; do not force a reference onto a text request just because an image is attached.
- If only materials are handed over and the goal is unclear, briefly suggest one possible job and ask what result they want. Do not automatically start producing every scene in a synopsis. If a job was already requested and the information is sufficient, give a short note and proceed; do not stop to get the same thing approved.
- First work out the result the user wants and the materials provided. Do not push internal terms such as mode, slot, stride or JSON onto the user as choices.
- If information is missing, ask only the questions that decide the result, grouped together. Skip anything already answered among "what job", "where the materials are", "how many are needed". Decide simple composition or style choices from the request context and mention them briefly.
- Judge which stage this is: sorting only, first run, revising results, or stop/resume. If only sorting was requested, stop there. For a first run, provide the finished file first and explain how to check with a small amount. For revision requests, reuse the existing materials, plan and shared engine.
- Separate what the user does from what the agent does. Reading materials, linking names, composing prompts, building and checking are the agent's job. Only what tools cannot do (login, pasting into the console, choosing a folder) is guided to the user, specifically. Do not make a browser connection a precondition for making the file.
- The first handoff ends with the latest run file link, where the references must be, what to do now, and the real scope of verification. If an error occurs, check the progress position and symptom and keep helping. The user's preference for short replies outranks the answer format.
- Tell the user about unsupported work before starting preparation. Do not advertise unimplemented features as available examples or have the user try code that fails.

Read the job description and the provided materials, and build one `paste_into_console.js` containing the prompts, engine and panel. Do not tie it to a specific project, account, folder or agent. Use it with an agent that can read files and run Python. This is an alpha version.

## Core working principles

Pick whichever of the three methods fits the request. Text generation swaps only the prompts; one-reference generation keeps the original. Sequential generation with several references is **one reference -> run all prepared prompts for that original -> delete the existing reference -> upload the next reference -> run the next prompt group**. The agent prepares per-image prompts and the run order, and the user connects the folder and starts when needed. Within one group always keep the same original, and never use a generated result as the next original.

The number of prompts per image can vary with the request. Do not fix it at 6 or apply the same sentence to every image. Do not ask the user to match characters and backgrounds for compositing, and do not extend multi-reference features into the default job. Generation without a reference and keeping a single original are also supported.

The folder mode of the current engine `0.3.2-alpha.6` implements this sequential-swap structure. The scope of actual accepted-request verification is recorded in references/release-checks.md. When a group's requests are processed it moves to the next image; do not describe it as waiting for the image render to finish. It ends after the last image, and infinite repeat is turned on only if the user asks for a full repeat. Sequential jobs use Shuffle OFF.

## Understanding the job and choosing a mode

On first use, read [environment checks and agent response guidelines](references/agent-workflow.md). Proceed in this order: **environment check -> per-cut materials and prompts -> finished run file and a short start guide -> evidence-based error handling**. Check separately whether file access, code execution and browser control are possible, and do not re-ask what is already confirmed. State the actual working location and verification scope clearly. Adapt the response examples to the facts, and do not copy unverified features as if completed.

From the request, identify what to keep, what to change, and the wanted number of cuts, repeats and order. Do not re-ask what you already have. When materials and purpose are sufficient, the agent chooses a mode below; do not leave the technical mode choice to the user.

| Job | Build option | Behavior |
|---|---|---|
| ① text only | `--reference none` | Swap prompts only. The site's existing reference is left empty. |
| ② one reference | `--reference manual` | Keep the original the user uploaded to the site and swap prompts only. |
| ③ reference folder (in order) | `--reference folder` | Process one original's prompt group, delete it, then upload the next numbered original. |

Generated results are not automatically linked as the next original. The table above is the scope the current engine supports. Explain that multi-reference compositing is unsupported only when it is requested separately; do not make it a precondition for default sequential runs.

## Folder sorting

When asked, look at the images and the scenario yourself and set the order to fit the purpose. Keep the originals and copy them into a separate folder such as `sorted_refs` as `01_name.png`, `02_name.jpg`. Keep extensions and briefly show original name -> new name -> reason for the order. Do not get ahead into prompt generation or running at a stage where only sorting was requested.

Read and edit relative to the actual work folder the user specified. Material names and cut order are separate things. When renaming or copying, also update the file links in the cut list and verify they exist. If you make a copy, state the exact path. Do not report a result of editing a different folder as editing the original folder.

Numbers are unique, 1-999; supported formats are PNG, JPG, JPEG and WebP. Put the images directly under the folder to connect. See [naming.md](references/naming.md) for detailed rules.

## Composing prompts

Write as many English prompts as the user requested. Compose subject, scene, framing, light and style for the purpose, and in variants separate what to keep from what to change. Do not arbitrarily turn requests to change a logo, text, illustration or hair into instructions to remove them, make them photoreal, or fix the hair. For a single-person single shot, also state that multiple views or sheet duplication are not wanted.

If a character sheet is requested and no other layout is specified, use **left face close-up -> center front full body -> right rear full body** as the default. The three views keep the same character's outfit, hair, art style and a common background. Do not force layout ratio or aspect ratio; requests by the user for a layout, number of views or keeping an existing sheet layout take priority. Apply this standard to sheet-variant requests too, but do not automatically turn ordinary outfit/hair changes or scene work into sheet work. Do not put single-view or no-sheet instructions into a sheet prompt. For example text, see the character sheet entry in [prompt-styles.md](references/prompt-styles.md).

If no specific aspect ratio is requested, use `aspect: "site"`. Model, aspect ratio and number of outputs use the site settings as they are. Defaults are Loop OFF and Shuffle OFF; change them on request. Sequential swaps use Shuffle OFF. Explain how to check with a small amount, but do not force a procedure that makes you wait for results before providing the full requested code.

Style reference: [prompt-styles.md](references/prompt-styles.md). Use [axes.md](references/axes.md) with `scripts/scan_refs.py` and `scripts/build_prompts.py` only when the default shooting-plan presets are wanted. Do not restrict free-form requests to the four presets.

Set the axes of change to fit each cut's purpose. A transformation keeps face and body and changes outfit and props. Character-background compositing keeps both references' identities and matches grounding, perspective and shadows. A camera comparison keeps pose, place and lighting and changes only framing; a lighting comparison keeps pose, place and framing and changes only the light. If combinations are requested, build per-cut combinations; do not apply the same fixed sentence to all materials.

## Data format

```json
{
  "schema_version": 1,
  "mode": "WITH_REF",
  "project": "user project name",
  "aspect": "site",
  "stride": 10,
  "prompts": {
    "1": "Use the original reference. Preserve the subject design. Change only the background to a light studio backdrop.",
    "11": "Use the same original reference. Preserve the subject design. Change only the background to a dark studio backdrop."
  },
  "labels": {"1": "light background", "11": "dark background"}
}
```

- `manual` and `folder`: `mode` is `WITH_REF`. `stride` is a multiple of 10 at or above the highest reference number (max 1000). Slot = reference number + variant index x stride. The example above is two variants of original 01. To process originals 01 and 02 once each, use slots 1 and 2. All variants of a number are processed before moving to the next original.
- `none`: `mode` is `PROMPT_ONLY`. Runs in ascending slot-number order and `stride` does not affect order (30 if omitted). Build fixed repeats from as many slots as needed. See [examples/EXAMPLES.md](examples/EXAMPLES.md) for an example.

Save it as `_prompts.json` via JSON serialization. The JSON is material for the agent's editing and building; it is not a file to put directly into the console.

## Building the run file

Read [console-workflow.md](references/console-workflow.md). Python 3.10 or later is required, and the path below is relative to this skill folder.

```sh
python scripts/build_console.py "workfolder/_prompts.json" --reference manual --out "workfolder/paste_into_console.js"
```

Change `manual` to `none` or `folder` to fit the job. Add `--infinite` and `--shuffle` only if infinite repeat or shuffle was requested. Reuse the existing `assets/engine.js` and `assets/console-panel.js`; do not write a new engine per project.

Run the syntax check and the `scripts/verify.js` check on the finished JS. In the final reply, give the run JS link, the reference folder if applicable, and a short sequence of use. Do not hand over only the JSON or the engine source and make the user assemble it.

## Usage guide

**F12 -> Console -> paste the whole code -> Enter -> Start**. Only when a blocking warning appears, guide the user to check the code and type `allow pasting` themselves. For `manual`, upload the original first; for `folder`, connect the image folder in the panel; for `none`, clear the site's existing reference.

Unlimited permission for the model is required, and the code turns it on and checks it at run time. Keep the run tab open and turn off computer sleep. Control Loop, Shuffle and Stop from the panel. Fold keeps the run going and Close and stop blocks further requests. An unconfirmed acceptance marker is logged and the run moves on to the next item; it is not counted as success.

## Alpha verification scope

Follow the [release verification record](references/release-checks.md) for the release environment and how to re-check. The aspect ratio is neither changed nor fixed; the site setting is read. This is not a guarantee of compatibility with every browser, screen or site change. When an error occurs, check the stage, number and error code saved from `Log · diagnostics` and fix the corresponding class. Do not re-run the whole set of requests accepted before the failure.

In alpha.5, 5 actual acceptances across the three modes were confirmed. Sequential references were 2 on the first original -> original swap -> 1 on the next original, with a Test once followed by Resume. Model, aspect ratio and number of outputs were preserved. Final image quality and other browser environments were not verified. Do not present it as error-free in every environment. For error handling see [troubleshooting.md](references/troubleshooting.md). alpha.6 only cleaned up engine internals; the site-handling code is unchanged.

## Sequential reference run: standards and verification

On the 2026-10-01 site, the order was `References(+)` -> `Upload media` -> a new card appears in the upload list -> select that card -> the reference attaches to the generation form. File upload completion and reference attachment completion are different. The engine passes the file from the connected folder, automatically selects the new card, then closes the list. Do not make the user pick the reference from the site list. Start in the same order from an empty generation form too. Wait until the menu has opened and the input is settled to one, and until it has closed and the form has updated. Delete in the list removes a stored asset, so do not use it to swap references.

1. On the real site, observe the attach button -> file input -> upload completion. Zero input fields means only that the search failed. Do not assert causes such as a hidden input, a menu being created, or an input outside the form without observing. With no connection, report the fact that real verification is blocked and which connection or materials are needed; do not report a fix as complete based on a presumed DOM.
2. Modify the shared engine to match the observed upload path. Confirm that the next image file and upload path are ready, then replace the existing reference. Use one original at a time, process all of that original's prompts, then move to the next image. Keep the link between file and prompt group.
3. The default panel consists of folder connection, current image name, prompt progress for that image, overall image progress, Start/Resume, and Stop. Do not put a matching table, repeat-count input, composition checkboxes or an apply-settings button on the default screen. Provide extra settings only when editing repeats is actually needed.
4. Verify through to: actual folder read -> first image upload -> all requested prompts for that image confirmed accepted -> existing image deleted -> second image upload -> first prompt of the second image confirmed accepted -> no duplicate of accepted requests on stop/resume. Mock test results do not replace this verification.
5. Distinguish typing in progress, accepted, unconfirmed, and cut requests done. Unconfirmed is logged and the run moves on to the next item; no success count and no automatic resend. Do not show requests done as the image being finished. Waiting for render completion needs a separate implementation and verification.
6. Keep the shared engine in one place, the skill's assets, and manage project differences through the material, cut and prompt lists. After a change, regenerate the run file with the shared builder. Clearly hand over the latest file to use from the actual work folder, and keep file and panel versions in sync. Do not make the user assemble code fragments. For a duplicate-declaration error, compare the actually executed copy with the delivered copy; do not conclude it was a paste mistake. A save-then-rerun approach is considered once repeated use proves necessary; do not add a new install procedure by default.
