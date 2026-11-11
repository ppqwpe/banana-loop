# Text-only example

`flower_meadow.json` is editable data for six cuts generated without a reference. Change prompts and labels to fit the job.

```sh
python scripts/build_console.py examples/flower_meadow.json --reference none --out "workfolder/paste_into_console.js"
```

Paste the whole finished JS into the Higgsfield console. Do not use the JSON file open button. By default it runs one round; Test once sends a single request. Aspect ratio, model and number of outputs follow the site settings.
