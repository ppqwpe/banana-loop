# File names and slot numbers

- Files: a number from 1 to 999 and a name, like `01_name.jpg`, `100_product.webp`. Extensions jpg/jpeg/png/webp.
- Two files with the same number is an error. Both the scanner and the folder loader reject it instead of overwriting.
- Gaps in numbers such as `01`, `03` are allowed. Missing numbers are not included in the generation list.
- Folder connection reads only files directly under the selected folder. Subfolders are not read.
- Put `_prompts.json` and the photos in the same folder.

## Renaming

If the user asked to preserve the originals, first copy them into `sorted_refs`, and apply the commands below to the copy folder only. `--apply` actually renames the files in that folder.

```sh
python scripts/scan_refs.py "folder" --rename
python scripts/scan_refs.py "folder" --rename --apply
```

`--rename` gives files that do not follow the rule the number after the current maximum. It does not fill gaps. To renumber everything as 1..N, use `--renumber`. It sorts by existing number first, then by name for non-compliant files.

```sh
python scripts/scan_refs.py "folder" --renumber
python scripts/scan_refs.py "folder" --renumber --apply
```

When only viewing the proposed changes, nothing is written. When applying, it checks for target-name collisions and renames through temporary names. After renaming is done, re-read the folder and write cuts.json, preserving existing entities and valid kinds. Do not let other programs change the files during the work. After renumbering, rebuild `_prompts.json` as well.

## Slots

`slot = reference_id + variant_index * stride`

`stride = highest reference number rounded up to a multiple of 10`, minimum 10.

`reference_id = ((slot - 1) % stride) + 1`

If the references are only numbers 1 and 3, stride=10 and the slots are 1/11/... and 3/13/.... Group 2 is not generated. A gap does not shift things onto a different reference.

Downloading results and linking file names are not automated. Compare the run log's slot/rep against the site history.
