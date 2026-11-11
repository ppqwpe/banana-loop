# Axis presets: schema and how to make them

## Why split into axes

When expanding one cut into N, the common failure is **loading all the variety onto one mode**. If choosing a mode drags camera, light and direction along with it, mode A in cut 1 and mode A in cut 20 end up identical in time of day, color and composition. Each image is fine, but skimming the whole set gives "they all look alike."

The builder first selects combinations laid out so they are staggered by cut and mode. If one is a duplicate, it searches the finite looks x compo x finish x moment space. Duplicates are checked on the actual string combination of camera, time, grading, composition, moment and finish. If the possible combinations are exhausted, it fails without saving.

This is a uniqueness check on prompt combinations and does not guarantee differences in the generated results. Variants of a repeated mode are labeled A1, A2 and so on.

## Schema

```jsonc
{
 "name": "industrial",
 "title": "Industrial/facilities - logistics center, factory, warehouse, office building",

 "kinds": ["ext_air","ext_gnd","ext_det","int","obj","det"],
 "default_kind": "int",
 "kind_rules": { "ext_air": ["항공","드론","aerial","drone"], ... },

 "finish":   [7 strings],          // shooting texture - global axis
 "no_text":  "instruction to render signs as blank surfaces",
 "negative": "comma list starting with text, lettering, ...",
 "ignore":   [8-10 attributes to ignore from the reference],
 "materials": {"treatment": "...", "condition": "..."},
 "focus":    "deep focus front to back, no tilt-shift, ...",

 "still":  {"B": "...", "J": "..."},   // one per mode where life=="none"
 "moment": {"<kind>": {"calm":[4 items], "busy":[4 items]}},

 "modes": [
  {"letter":"A", "name":"restrained cinematic",
   "life":"calm",                      // calm | busy | none
   "direction":"two sentences on what this mode is for",
   "licence":"what may be added or changed",
   "light":"one line on the character of the light",
   "cam":   {"<kind>":"position, height, framing, field-of-view feel"},   // every kind
   "looks": [["time/weather","grading"], x3],
   "compo": ["screen structure", x3]}
 ]
}
```

The number and names of `kinds` differ by field. `cam` and `moment` must cover `kinds` **completely**; `check_preset()` in `build_prompts.py` catches this before building. The Korean words inside `kind_rules` are intentional: they match Korean file names alongside the English keywords.

## Bundled presets

| Name | Field | Modes | Cut kinds |
|---|---|---|---|
| `industrial` | logistics center, factory, warehouse, office building | 10 | `ext_air` `ext_gnd` `ext_det` `int` `obj` `det` |
| `product` | packaging, devices, single items | 8 | `hero` `group` `det` `situ` |
| `space` | stores, offices, residences, hotels | 8 | `ext` `int` `vig` `det` |
| `people` | workers, teams, usage scenes | 8 | `por` `work` `team` `hand` |

If `--variants` is larger than the number of modes, it goes around the modes several times. On the second lap `p=1`, so look, composition, finish and moment all take different positions.

## When adding a new field

Copying and editing `industrial.json` is quickest. Only the rules to keep are listed.

**A mode must be a shooting method, not an adjective.** "Make it grand" is not a mode. "Camera on the floor looking up the aisle, 18mm" is a mode. If two modes can be described in the same sentence, merge them into one.

**`cam` states position and height and ends with the field-of-view feel.** Spread the field of view widely, 18mm to 200mm. This is the only safeguard against "why is everything from the side".

**`looks` must not conflict with that mode's `light`.** Putting "soft overcast sky" into a "hard single light" mode makes the model drop one of the two.

**`compo` must not conflict with that mode's `cam`.** Do not put "verticals converge" in a high-angle mode.

**`moment` is what happens, not lighting.** "Warm light comes in" belongs to the lighting axis. "A forklift passes in the background" is a moment.

**Include at least one mode with `life` set to `none`.** If everything is busy, the whole set gets noisy. Empty, quiet cuts give the edit a place to breathe.

**Do not touch the text ban.** `negative` must always start with this prefix.

```
text, lettering, letters, words, typography, Korean hangul, numbers,
signage text, logo, wordmark, brand name, captions, subtitles,
watermark, garbled writing,
```

## Checking after making it

```bash
python3 -c "
import sys; sys.path.insert(0,'scripts')
from build_prompts import load_preset, check_preset
ps = load_preset('scripts/axes/new_preset.json'); check_preset(ps)
print('modes', len(ps['modes']), '· kinds', ps['kinds'])"
```

Then do one actual build and confirm `Unique    N / N  ✓`. If there are few axis values, duplicates show up here. Cutting `looks` or `compo` to fewer than 3 almost certainly triggers it.
