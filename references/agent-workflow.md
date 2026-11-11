# Progress by environment and agent responses

What the agent can actually do matters more than the agent's name. File access, code execution and browser connection are separate abilities. Do not tell the user the rest are possible just because one is. The templates below are a standard for conveying only the needed information briefly; they are not a form for re-asking what the user already provided.

## First reply after receiving materials

After checking the materials, speak in 3-5 sentences. Replace the bracketed parts of the template with what you actually checked.

> I checked [the character image, background image and synopsis].
> I'll proceed by **[generating from several references in order]**, as you requested.
> [I'll prepare prompts for each image to fit the request, and when one image's group is done I'll swap in the next image.]
> First, [I'll keep the originals, sort the working order and build the run file].

If there are only materials and the purpose is unknown, change the last sentence to something like "We could start with character variants. What result do you want to make?" If the purpose is already clear, proceed without asking. If information needed for run preparation, such as the number of prompts, is missing, ask only about that item. If some material is unchecked, briefly separate what was read from what is missing.

One sentence is enough to explain each of the three methods.

- **Text only:** "I'll prepare prompts that fit the synopsis and run them in order without attaching an image."
- **One reference:** "I'll keep the same original and make the variants you asked for, such as outfit and hair, one after another."
- **Reference folder (in order):** "I'll process all prompts for original 01, then delete the reference and move to original 02."

Add one sentence about environment constraints only when they change the current progress. When guiding sequential swaps, state the real status, such as "This is the current alpha version, and real-site verification of automatic swapping in this release is still pending." Do not print the whole environment checklist in the first reply. After that, give the preparation result and the action the user needs.

## 1. Check the environment first

### Handling common first requests

| What the user says | What the agent does | Action left to the user |
|---|---|---|
| "I'm new, how do I do this?" | Check the accessible skill/materials and execution abilities, and ask only about the wanted result | Describe the job and hand over materials |
| "Change this character's clothes" | Build as variants of the same original. If the number of changes is not given, ask only for the needed number. Do not force a sheet layout automatically | Upload the original and run the finished JS |
| "Make this kind of background without photos" | Build text-only; do not ask for a reference folder | Clear the site's existing attachment and run |
| "Just handle it with this folder" | Work out the purpose from the images and plan. If there is no purpose at all, ask what result they want. Do not treat the file count as the cut count | Describe the purpose if needed |
| "Combine this character with this background" | First check multi-reference support. Say that the current engine does not support it, and explain that only materials and cut planning can be prepared | Do not ask them to run before support exists |
| "Change just number 2 from before" | Read the existing cut list and progress log and reflect the revision scope. Do not re-run accepted requests in full | Check the new file's scope, then run |
| "It doesn't work" | Check any logs or screens already obtained first. If none, ask for the error text or a screenshot of the input box and panel, and for the previous action | Report the symptom instead of editing code |

### Files to show the user

The entry point of the distribution folder is `START_HERE.txt`, and the agent's entry point is `SKILL.md`. assets, scripts and references are for the agent. Do not make it so the user must edit these folders directly or know the install location in order to start.

In the work folder, clearly separate the original materials, the actual reference location to connect, and the latest run JS to use. Do not keep adding other "revised / final / final2" files. If needed, keep earlier run files elsewhere and update the finished file at the same delivery path. Preserve user changes, and when moving or renaming files update the links too.

Keep the first-use guide short, and give explanations of environment differences at the point where a problem occurs. Do not list install instructions, diagnostic tables and implementation notes from the start. When a result is out, tell them where to check it and how to request follow-up changes.

Check from readable materials and tools, and ask only the truly necessary unchecked items, in one go.

| Check | Standard for proceeding |
|---|---|
| Skill files | Confirm it is the whole folder including assets, scripts and references, not just SKILL.md. Read the engine version. |
| Actual work folder | Confirm the absolute path and the actual file list. Do not assume you can access the user's local path from another PC or a cloud environment. |
| Reading materials | Confirm whether you can read the images and plan. Do not fix a person or a cut's role from file names alone. |
| Making the run file | Confirm it can be built with Python 3.10 or later. If Node is available, use it for syntax and regression checks. If not, state which checks were not done. |
| Real site | Check the Higgsfield image tab in the connected browser. Without a connection, code preparation is possible but real behavior cannot be verified. |
| Site readiness | Check login, model, whether Unlimited is available, and the current attachment state. Do not change subscription, credits or model on your own. |
| Browser environment | Check browser name, language and screen state. Account for site redesigns, menu position and upload method differences. Do not promise compatibility with other browsers or OSes in advance. |

Handling by agent environment:

- If files and code execution are possible, do material checks, building and local checks. Proceed this far even without a browser.
- If you can only read attachments, prepare the task list and prompts, but do not say you modified the user's local folder. If you cannot make the run file, state which steps are possible and what execution environment is needed.
- Even with a browser connected, there may be no tool for running console code or uploading files. In that case, guide only the minimum steps the user must take and observe the result.
- If needed materials are missing, do not invent a presumed project. Finish the parts that can proceed independently and request only the missing materials.

Example notice before reading materials:

> I'll read the materials and the skill and briefly tell you how we can proceed.

Do not copy the sentence above as is, fixing the environment before you have checked the tools. Replace the environment description with what was actually confirmed.

## 2. Show the preparation result briefly

Distinguish the number of materials from the number of cuts, and set each cut's reference role and variant count. Use the counts the user specified; do not fix 6 as the default. Distinguish scenes from the plan from scenes for technical verification. Ask only about unclear matching, and do not require approval at every step.

Example response:

> I prepared prompts for each image.
> - Image 01: 2 outfit variants
> - Image 02: 3 lighting variants
> After processing the two requests for 01, I delete the reference, upload 02 and process three requests.
> The originals are kept, and the work location is `[actual path]`.

Replace the counts with the requested values. Default sequential work uses one reference at a time. Do not suggest or require compositing or multi-reference matching unless separately requested. Apply the default of face close-up, front and rear only for sheet requests.

## 3. Delivered files and how to start

When you have completed through the runnable stage, convey the following briefly.

> Run file: `[latest JS link]` · version `[actual version]`
> Uses `[reference folder]`.
> Higgsfield image page -> F12 Console -> paste the whole JS -> Enter -> connect folder -> Start.
> Checked: `[checks actually passed]`. Unchecked: `[remaining actual behavior]`.

For a job without references, omit the folder connection step; for manual reference mode, replace it with uploading the original. Guide typing `allow pasting` directly only when a paste-blocking warning appears. Explain that the JSON is not the console run file. Tell them to keep the tab open and turn off computer sleep. Do not say that every screen-sleep method or background execution has been verified.

Check in the implementation whether progress records survive a reload. The current version does not support re-importing, so the new code must exclude items already accepted. Distinguish Resume within the same session from re-running after a page reload.

## 4. Error response template

Answer in the order **confirmed symptom -> cause not yet known -> next check/action -> where to resume**. Do not blame the user, and do not conclude the site is fine on the strength of a passing mock test.

Upload example:

> 0 upload input fields were found. It is not yet confirmed whether a menu must be opened or the input is in a different place. I'll compare the current attachment screen against the run file version. Please don't delete the existing reference first.

Unconfirmed acceptance example:

> For cut 01, request 3, the acceptance marker could not be confirmed. It was logged without being counted as a success or automatically resent. Please check this request in the site history.

Minimum information needed for diagnosis:

- Browser, OS, site language, model used, run file/panel version
- Current cut and prompt position, last action, error text
- If possible, a screenshot showing the input area and panel, and the JS actually run

Do not re-request information you already have. Do not ask for cookies, tokens, account passwords or full console/network dumps. If the diagnostics file includes project prompts or file names, explain they should check it before sharing. Do not conclude that 429/CSP logs from the service are the cause of automation failure merely because they are visible.

## 5. Verification results and release notes

Write verification in stages: file/syntax check / mock run / actual upload, cut switching and acceptance / confirming the result images are finished. Passing one stage does not guarantee the next.

When real verification is done, record the date, browser, OS, site language, model, engine version, number of references, cuts and prompts run, and the observed result. Leave unobserved items as unverified. Do not mark compatibility with every environment because it passed in one.

Final response example:

> I updated the latest run file at `[actual path]`.
> Checked: processing of original 01's prompt group, deleting the existing reference and uploading original 02, and no duplication of accepted items on stop/resume.
> Image quality and other browser environments have not been verified yet.

Use this example only if that verification was actually performed. With an alpha release, also provide the verification environment, current limits, and the minimum information needed for error reports. Do not make extra installation or complicated setup a baseline condition of first use.
