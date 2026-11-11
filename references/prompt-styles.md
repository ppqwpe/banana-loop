# Style presets and prompt writing

## Prompt structure

```
[shot type/angle] [subject + action/pose] [environment/background], [common style suffix]
```

- **Shot type**: extreme close up / close up / medium shot / full shot / wide shot / extreme wide shot
- **Angle**: low angle / eye level / high angle / overhead top-down / dutch angle / over-the-shoulder
- **Common style suffix**: one of the presets below or a combination. It must be attached **identically to every cut** to keep the tone consistent.

---

## Style suffix presets

### Cinematic 16mm vintage
```
cinematic 16mm film still, captured on grainy vintage film with warm saturated color grading, 90s art film aesthetic, heavy film grain texture, lo-fi nostalgic cinematic quality, painterly bokeh
```

### Cinematic macro insert
```
extreme close up macro shot, heavily defocused shallow depth of field, soft hazy warm sunlight, dreamy abstract painterly composition, 8mm experimental film aesthetic, heavy film grain
```

### Anime illustration
```
painterly anime illustration style, deep blue moody magical palette, soft volumetric light, glowing particles drifting, dreamy ethereal atmosphere, hand-painted anime art style
```

### Vintage polaroid
```
vintage polaroid photograph, soft faded colors, light leak, sun flare, nostalgic warm tones, dreamy hazy quality, 70s film aesthetic
```

### Dark fantasy
```
dark atmospheric fantasy illustration with deep blue and cyan monochromatic palette, mysterious nocturnal mood, deep moody shadows, heavy film grain, rough painterly brushstrokes
```

### Photoreal portrait
```
photorealistic portrait photography, natural soft window light, shallow depth of field 85mm lens, true-to-life skin texture with visible pores, neutral color grading, editorial photography quality
```

### Product / commercial
```
clean commercial product photography, seamless gradient backdrop, crisp studio softbox lighting with controlled specular highlights, high detail macro clarity, premium advertising aesthetic
```

For a style not in the presets, pull keywords from the user's description and combine them:
`[medium] + [color/grading] + [lighting] + [texture/grain] + [mood]`

---

## Character consistency

If the same person must stay consistent across several cuts, make an **appearance block** and put it into every prompt together with the style suffix.

```
a young woman with short blonde bob hair, wearing a white sleeveless dress and white ankle socks and simple white shoes, slim build
```

- Write mainly reproducible elements such as **hair / outfit / build / props** rather than facial features
- Repeat the elements to keep, and leave out of the fixed block the elements the user wants to change, such as outfit and hair.
- If there is a reference, use the original through the integrated skill's manual or folder mode.

## Default character sheet

Use only when a character sheet is requested. If no other layout is specified, the default is a face close-up on the left, a front full body in the center and a rear full body on the right. If the user specifies another arrangement or number of views, or says to keep an existing sheet layout, that request takes priority. Do not require a fixed aspect ratio or panel ratio.

```text
Create a character reference sheet showing the same character in three views: a face close-up on the left, a front-facing full-body view in the center, and a rear full-body view on the right. Keep the character identity, outfit, hairstyle, body proportions, and art style consistent across all three views, on a shared simple background. Keep both full-body views completely visible and arrange the views clearly within the chosen canvas.
```

Add the actual character features and the requested changes to the sentence above. If the outfit is changed on a sheet, match all three views to the same new outfit. When using an original reference, add an identity-preservation instruction, but remove leftover test instructions that conflict with the sheet layout, such as `single view`, `not a turnaround sheet` and `no multiple views`. Do not apply this layout to an ordinary single-cut, scene or outfit-change request just because the reference is a sheet.

---

## Content wording

Describe in concrete terms the permitted scene the user wants. Do not offer guidance that hides or rewords content to get around the generation service's blocks. For people, state age, outfit and pose clearly in a way that fits the context.

---

## Common mistakes

- **Writing motion descriptions** — `walking slowly`, `camera slowly pushes in` are meaningless in a still. Use a frozen pose like `mid-stride, one foot lifted`.
- **Different style suffix per cut** — the tone jumps around. The suffix must be identical, down to copy and paste.
- **Prompt too short** — a 20-word prompt gets interpreted however the model likes. At least 50 words.
- **Using negatives** — phrases like `no people` or `without background` end up drawing exactly that. Describe only what you want.
- Choose whether to use a reference from the integrated skill's none, manual or folder modes, to fit the job.
