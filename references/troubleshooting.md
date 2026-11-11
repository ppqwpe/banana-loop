# Batch run troubleshooting

Error reports follow the error-response order in [progress by environment and response template](agent-workflow.md). The actions below are possible directions to check; do not assert any as the cause without observing the screen.

| Symptom | Action |
|---|---|
| Pasting code in the Console is blocked | After checking the distributed code, follow the paste-blocking warning's instructions: type `allow pasting` yourself on the input line and press Enter. Then paste the engine code and press Enter. If there is no warning, skip this step. |
| Unlimited toggle check fails | Check the model and the available modes on the site. If there is no toggle, do not run. Do not press a different switch instead. |
| Cannot identify the input box/Generate | Close any other input modal and confirm this is the Image generation screen. Do not pick arbitrarily among several candidates. |
| Reference deletion fails | Remove the previous reference yourself on the site and start again. This version does not change React internal state or use broad coordinate clicks. |
| Upload succeeded but the reference is not attached | The current site attaches to the generation form only after you upload to the Assets list and select the new card. The current engine handles this step. If there are several new cards, do not pick arbitrarily. |
| An old image remains | Detach it with the reference remove button on the generation form. Delete in the Assets list deletes a stored asset, so do not press it. |
| Upload failure | First check the next file and the attach menu. Upload and attachment confirmation wait up to 60 seconds, and an error is shown on failure. Do not blindly upload the file again and again. |
| Prompt input failure | Distinguish a displayed-string mismatch from the site's internal input state not being updated. Check the input events and the error at actual generation. Do not shorten or split the prompt without evidence that length is the cause. |
| 0 upload input fields | Check on the actual screen whether the input only appears after pressing the attach button, or sits in a menu or outside the form. Do not assert it is a hidden input. Do not delete the existing reference first, before confirming the next file and upload path. |
| Duplicate declarations such as `inputs` | Compare the code actually run with the delivered copy and version. Do not conclude it was a paste mistake from a syntax check of the delivered copy alone. |
| 429 or CSP errors on the site | Check whether the request relates to the automation action failing. Do not settle on those logs alone as the cause of an upload or input error. |
| Acceptance marker unconfirmed | Record as unconfirmed and move to the next item. Check the real result in the site history. |
| Internet connection lost | Resume after the connection is restored. If offline during preparation, stop before changing references or prompts. If it dropped mid-send, compare the unconfirmed record with the site history. |
| Unexpected error | Save from Log · diagnostics. Look at lastError's code, stage, ref and slot and the matching entry to find the failure point. Do not resend items already accepted before the error. |
| Queue wait timeout | It waits up to 5 minutes, then stops. Check the site's queue, then Start again. |
| Duplicate number | Change the file with the same number to another number, or review the `--renumber` proposal. |
| Combination capacity exceeded | Reduce the number of cuts/variants or add more preset looks/compo/finish/moment. The existing output is preserved. |

While running, do not change the site's model, aspect ratio, number of outputs, reference, or other generate buttons. `accepted` means a new Queued/Generating/Pending item was seen on the screen. It is separate from the service's final generation success. If the acceptance signal cannot be seen, record it as unconfirmed and move to the next item.

Save the log before reloading. Re-importing the log and downloading images are not supported. Stop the existing run and paste the whole fixed file. If the project data on the same page is exactly the same, the engine hands over the existing progress position and connected files. On data changes or reload, the agent must prepare a run file that excludes completed items.

## Results

If it looks like a miniature model, check focus, depth of field and camera height. If variants look similar, review the camera and lighting axes. Check subject shape, logos and materials after generation. Prompt combination uniqueness and image quality are evaluated separately.
