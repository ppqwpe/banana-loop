#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cut list × axis preset → _prompts.json

Spreads each cut over combinations of axes (camera, lighting, time/weather, grade,
composition, moment, finish) and writes one prompt per slot. No combination repeats.

Slot numbers
    slot = cut number + variant index × stride
    stride is the highest cut number rounded up to a multiple of 10 (26 cuts → 30).
    The engine maps a slot back to its reference with ((slot-1) % stride) + 1,
    so one reference stays attached while all of its variants run.

Usage
    python3 build_prompts.py cuts.json --preset industrial --variants 10 \
        --project "Sample brand film" --out <reference folder>/_prompts.json
"""

import argparse
import json
import math
import os
import sys
from collections import Counter
from itertools import product
from scan_refs import write_json


def load_preset(name_or_path):
    p = name_or_path
    if not os.path.exists(p):
        p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'axes', name_or_path + '.json')
    if not os.path.exists(p):
        here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'axes')
        avail = sorted(f[:-5] for f in os.listdir(here)) if os.path.isdir(here) else []
        sys.exit(f'Preset not found: {name_or_path}\nAvailable: {", ".join(avail)}')
    with open(p, encoding='utf-8-sig') as stream:
        return json.load(stream)


def check_preset(ps):
    """Catch a broken preset before any prompt is built."""
    bad = []
    kinds = ps['kinds']
    if not kinds or not ps.get('modes'):
        sys.exit('A preset needs non-empty kinds and modes.')
    if len(kinds) != len(set(kinds)):
        sys.exit('The preset repeats a kind.')
    for m in ps['modes']:
        miss = [k for k in kinds if k not in m['cam']]
        if miss:
            bad.append(f"mode {m['letter']}: cam is missing {miss}")
        if len(m['looks']) < 2:
            bad.append(f"mode {m['letter']}: {len(m['looks'])} looks (need at least 2)")
        if len(m['compo']) < 2:
            bad.append(f"mode {m['letter']}: {len(m['compo'])} compo (need at least 2)")
        if m['life'] not in ('none', 'calm', 'busy'):
            bad.append(f"mode {m['letter']}: invalid life value")
        if m['life'] == 'none' and m['letter'] not in ps.get('still', {}):
            bad.append(f"mode {m['letter']}: life=none but no still entry")
    for k in kinds:
        mk = ps.get('moment', {}).get(k)
        if not mk or not mk.get('calm') or not mk.get('busy'):
            bad.append(f"moment has no calm/busy for {k}")
    if len(ps.get('finish', [])) < 3:
        bad.append('fewer than 3 finish entries')
    if bad:
        sys.exit('Preset errors\n  ' + '\n  '.join(bad))


def pick_axes(ps, cut, mode, li, ci, fi, mo_i):
    """Axis values of one variant. Duplicates are checked on these; the full prompt is built only after choosing."""
    hour, grade = mode['looks'][li]
    if mode['life'] == 'none':
        moment = ps['still'][mode['letter']]
    else:
        pool = ps['moment'][cut['kind']][mode['life']]
        moment = pool[mo_i % len(pool)]
    return {'camera': mode['cam'][cut['kind']], 'hour': hour, 'grade': grade,
            'compo': mode['compo'][ci], 'moment': moment, 'finish': ps['finish'][fi]}


def signature_of(axes):
    # A JSON string keeps it hashable even if an axis value is an object.
    return json.dumps([axes[k] for k in ('camera', 'hour', 'grade', 'compo', 'moment', 'finish')],
                      ensure_ascii=False, sort_keys=True)


def build_one(ps, cut, mode, axes, aspect="16:9"):
    entity = cut['entity'].strip()
    hour, grade, compo, finish, moment = (axes[k] for k in ('hour', 'grade', 'compo', 'finish', 'moment'))

    o = {
        "task": "reference_photo_to_brand_film_still",
        "mode": mode['name'],
        "reasoning_mandate": {
            "step_1": "Read the reference only as a factual RECORD of what exists: form, colours, materials, equipment types, spatial layout.",
            "step_2": "IGNORE the reference's camera angle, framing, time of day and weather entirely. Do not repeat them.",
            "step_3": "Re-shoot the same real subject from the NEW camera position in `camera`, at the time given in `time_and_weather`, lit as `lighting` describes.",
            "step_4": "Anything added must be MORE OF THE SAME KIND already visible. Never introduce a different type of subject.",
            "step_5": "Leave every surface free of writing. No text of any kind is to appear in the output image.",
        },
        "camera": axes['camera'],
        "time_and_weather": hour,
        "lighting": mode['light'],
        "colour_grade": grade,
        "moment": moment,
        "direction": mode['direction'],
        "scene_licence": mode['licence'],
        "subject": {
            "entity": entity,
            "identity_lock": {
                "form_and_proportion": "STRICT_MATCH_REFERENCE",
                "colours_and_materials": "STRICT_MATCH_REFERENCE",
                "signage_and_logos": "REMOVE_ALL — keep the blank panel, drop everything written on it",
                "text_and_lettering": "NONE_ANYWHERE_IN_THE_IMAGE",
                "equipment_types": "STRICT_MATCH_REFERENCE",
            },
            "free_to_restage": ["camera_position", "camera_height", "lens", "framing", "time_of_day",
                                "weather", "lighting_design", "atmosphere", "colour_grade",
                                "people_and_vehicle_placement", "quantity_of_identical_units"],
        },
        "text_policy": ps['no_text'],
        "composition": {"aspect_ratio": aspect, "structure": compo},
        "materials": ps['materials'],
        "finish": finish,
        "focus": ps['focus'],
        "references": {"input_source": "client_reference_photograph",
                       "influence_strength": "identity_and_materials_only",
                       "ignore_attributes": ps['ignore']},
        "negative_prompt": ps['negative'],
    }
    return ("Follow this JSON spec exactly.\n"
            + json.dumps(o, ensure_ascii=False, separators=(",", ":")))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cuts', help='cuts.json written by scan_refs.py')
    ap.add_argument('--preset', required=True, help='axis preset name or path')
    ap.add_argument('--variants', type=int, default=None, help='variants per cut (default: number of preset modes)')
    ap.add_argument('--project', default='', help='project name (shown on the panel)')
    ap.add_argument('--aspect', default='16:9', choices=['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3'])
    ap.add_argument('--out', help='output path (default: _prompts.json next to cuts.json)')
    ap.add_argument('--allow-gaps', action='store_true',
                    help='kept for compatibility: gaps in numbering are always allowed now')
    args = ap.parse_args()

    data = json.load(open(args.cuts, encoding='utf-8-sig'))
    if not isinstance(data.get('cuts'), dict):
        sys.exit('A cuts object is required.')
    if any(not str(k).isdigit() or str(int(k)) != k for k in data['cuts']):
        sys.exit('Cut keys must be positive integer strings without leading zeros.')
    cuts = {int(k): v for k, v in data['cuts'].items()}
    if not cuts:
        sys.exit('There are no cuts.')

    ps = load_preset(args.preset)
    check_preset(ps)

    modes = ps['modes']
    V = len(modes) if args.variants is None else args.variants
    if not 1 <= V <= 100:
        sys.exit('Variants must be 1-100.')
    if len(cuts) * V > 10000:
        sys.exit('At most 10000 slots in total. Split the project.')
    if any(n < 1 or n > 999 for n in cuts):
        sys.exit('Reference numbers must be 1-999.')
    if any(not isinstance(c, dict) or not isinstance(c.get('entity'), str) or not c['entity'].strip() for c in cuts.values()):
        sys.exit('Fill in entity (an English description written from the image) for every cut.')
    M = len(modes)
    maxcut = max(cuts)
    stride = max(10, int(math.ceil(maxcut / 10.0) * 10))

    # Catch cut kinds the preset does not know
    unknown = sorted({c['kind'] for c in cuts.values()} - set(ps['kinds']))
    if unknown:
        sys.exit(f"cuts.json uses kinds the preset does not have: {unknown}\n"
                 f"Preset '{ps['name']}' knows: {ps['kinds']}")

    prompts, labels, used = {}, {}, set()
    collisions = 0

    for n in sorted(cuts):
        cut = cuts[n]
        for i in range(V):
            mi, p = i % M, i // M
            mode = modes[mi]
            L, K, Fn = len(mode['looks']), len(mode['compo']), len(ps['finish'])
            pool_len = 1 if mode['life'] == 'none' else len(ps['moment'][cut['kind']][mode['life']])

            # Prefer the original staggered axes, then search the full finite pool.
            preferred = ((n + mi + p * 2) % L, (n // 3 + mi * 2 + p) % K,
                         (n * 3 + mi * 5 + p * 3) % Fn,
                         (n * 3 + mi * 5 + p * 7) % pool_len)
            chosen = None
            candidates = [preferred]
            candidates.extend(product(range(L), range(K), range(Fn), range(pool_len)))
            for li, ci, fi, mo in candidates:
                axes = pick_axes(ps, cut, mode, li, ci, fi, mo)
                signature = signature_of(axes)
                if signature not in used:
                    chosen = (signature, axes)
                    break
                collisions += 1
            if chosen is None:
                sys.exit(f"Out of combinations: cut {n}, mode {mode['letter']}. Use fewer cuts/variants or add axis values. Nothing was saved.")
            used.add(chosen[0])
            slot = n + i * stride
            prompts[slot] = build_one(ps, cut, mode, chosen[1], args.aspect)
            labels[slot] = f"{cut['slug']}_{mode['letter']}{p + 1}"

    # ── checks ────────────────────────────────────────────────────
    combos = set()
    for slot, txt in prompts.items():
        j = json.loads(txt.split('\n', 1)[1])
        combos.add((j['camera'], j['time_and_weather'], j['colour_grade'],
                    j['composition']['structure'], j['moment'], j['finish']))
    lens = [len(v) for v in prompts.values()]

    print(f"\nPreset    {ps['name']} — {ps['title']}")
    print(f"Cuts      {len(cuts)} (highest number {maxcut}) · stride {stride}")
    print(f"Variants  {V}/cut · {M} modes" + (f" (cycles the modes {math.ceil(V/M)} times)" if V > M else ""))
    print(f"Slots     {len(prompts)} · numbers {min(prompts)}-{max(prompts)}")
    print(f"Length    {min(lens)} - {max(lens)} chars")
    print(f"Unique    {len(combos)} / {len(prompts)}" + ('  ✓' if len(combos) == len(prompts) else '  ✗ duplicates'))
    if collisions:
        print(f"          ({collisions} collisions resolved by searching the finite pool)")

    for axis, get in (('camera', lambda j: j['camera']),
                      ('time/weather', lambda j: j['time_and_weather']),
                      ('grade', lambda j: j['colour_grade']),
                      ('composition', lambda j: j['composition']['structure']),
                      ('moment', lambda j: j['moment']),
                      ('finish', lambda j: j['finish'])):
        vals = [get(json.loads(v.split('\n', 1)[1])) for v in prompts.values()]
        c = Counter(vals)
        print(f'  {axis:<13} {len(c):>3} kinds · most used {c.most_common(1)[0][1]}x')

    # Does every slot map back to a reference?
    wrong = [s for s in prompts if ((s - 1) % stride) + 1 not in cuts]
    if wrong:
        print(f'  ✗ slots that do not map to a reference: {wrong[:5]}')
        sys.exit(1)
    print('  ✓ every slot maps back to a reference number')

    gaps = [n for n in range(1, maxcut + 1) if n not in cuts]
    if gaps:
        print(f'  gaps in numbering {gaps}: only existing cuts are built; slot mapping still holds.')
    else:
        print(f'  ✓ reference numbers 1-{maxcut} are continuous')

    out = args.out or os.path.join(os.path.dirname(os.path.abspath(args.cuts)), '_prompts.json')
    payload = {
        'schema_version': 1,
        'mode': 'WITH_REF',
        'aspect': args.aspect,
        'project': args.project or ps['title'],
        'preset': ps['name'],
        'stride': stride,
        'variants': V,
        'prompts': {str(k): prompts[k] for k in sorted(prompts)},
        'labels': {str(k): labels[k] for k in sorted(labels)},
    }
    if len(json.dumps(payload, ensure_ascii=False).encode('utf-8')) > 20 * 1024 * 1024:
        sys.exit('The prompt file would exceed 20 MB. Split the cuts/variants. The previous output is kept.')
    write_json(out, payload)
    print(f'\nSaved: {out}  ({os.path.getsize(out)//1024} KB)')
    print('Next: build the console JS with the prompts embedded using build_console.py. Do not paste the JSON into the console.\n')


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except (ValueError, KeyError, OSError, TypeError) as exc:
        sys.exit(str(exc))
