#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""컷 리스트 × 축 프리셋 → _prompts.json

한 컷을 여러 축(카메라·조명·시간/날씨·그레이딩·구도·순간·마감)의 조합으로
펼쳐서 슬롯별 프롬프트를 만든다. 조합 중복이 0이 되도록 강제한다.

슬롯 번호
    슬롯 = 컷번호 + 변형번호 × stride
    stride 는 컷 최대번호를 10 단위로 올림한 값 (26컷 → 30).
    엔진은 refOf(슬롯) = ((슬롯-1) % stride) + 1 로 레퍼를 되찾는다.
    즉 레퍼 한 장을 올려두고 그 그룹의 변형을 연속 생성할 수 있다.

사용
    python3 build_prompts.py cuts.json --preset industrial --variants 10 \
        --project "샘플 브랜드필름" --out <레퍼폴더>/_prompts.json
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
        sys.exit(f'프리셋을 못 찾았다: {name_or_path}\n쓸 수 있는 것: {", ".join(avail)}')
    with open(p, encoding='utf-8-sig') as stream:
        return json.load(stream)


def check_preset(ps):
    """프리셋이 망가져 있으면 프롬프트를 만들기 전에 잡는다."""
    bad = []
    kinds = ps['kinds']
    if not kinds or not ps.get('modes'):
        sys.exit('프리셋은 kinds와 modes가 비어 있으면 안 됩니다.')
    if len(kinds) != len(set(kinds)):
        sys.exit('프리셋의 kind가 중복되었습니다.')
    for m in ps['modes']:
        miss = [k for k in kinds if k not in m['cam']]
        if miss:
            bad.append(f"모드 {m['letter']}: cam 에 {miss} 없음")
        if len(m['looks']) < 2:
            bad.append(f"모드 {m['letter']}: looks 가 {len(m['looks'])}개 (최소 2)")
        if len(m['compo']) < 2:
            bad.append(f"모드 {m['letter']}: compo 가 {len(m['compo'])}개 (최소 2)")
        if m['life'] not in ('none', 'calm', 'busy'):
            bad.append(f"모드 {m['letter']}: life 값이 잘못됨")
        if m['life'] == 'none' and m['letter'] not in ps.get('still', {}):
            bad.append(f"모드 {m['letter']}: life=none 인데 still 항목이 없음")
    for k in kinds:
        mk = ps.get('moment', {}).get(k)
        if not mk or not mk.get('calm') or not mk.get('busy'):
            bad.append(f"moment 에 {k} 의 calm/busy 가 없음")
    if len(ps.get('finish', [])) < 3:
        bad.append('finish 가 3개 미만')
    if bad:
        sys.exit('프리셋 오류\n  ' + '\n  '.join(bad))


def pick_axes(ps, cut, mode, li, ci, fi, mo_i):
    """한 변형의 축 값. 중복 검사는 이 값으로만 하고 프롬프트 전문은 고른 뒤에 만든다."""
    hour, grade = mode['looks'][li]
    if mode['life'] == 'none':
        moment = ps['still'][mode['letter']]
    else:
        pool = ps['moment'][cut['kind']][mode['life']]
        moment = pool[mo_i % len(pool)]
    return {'camera': mode['cam'][cut['kind']], 'hour': hour, 'grade': grade,
            'compo': mode['compo'][ci], 'moment': moment, 'finish': ps['finish'][fi]}


def signature_of(axes):
    # json 문자열로 묶어 축 값이 객체여도 해시 가능하게 한다.
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
    ap.add_argument('cuts', help='scan_refs.py 가 만든 cuts.json')
    ap.add_argument('--preset', required=True, help='축 프리셋 이름 또는 경로')
    ap.add_argument('--variants', type=int, default=None, help='컷당 변형 수 (기본: 프리셋 모드 수)')
    ap.add_argument('--project', default='', help='프로젝트 이름 (패널에 표시)')
    ap.add_argument('--aspect', default='16:9', choices=['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3'])
    ap.add_argument('--out', help='저장 경로 (기본: cuts.json 옆의 _prompts.json)')
    ap.add_argument('--allow-gaps', action='store_true',
                    help='호환 옵션: 번호 공백은 이제 기본 지원한다')
    args = ap.parse_args()

    data = json.load(open(args.cuts, encoding='utf-8-sig'))
    if not isinstance(data.get('cuts'), dict):
        sys.exit('cuts 객체가 필요합니다.')
    if any(not str(k).isdigit() or str(int(k)) != k for k in data['cuts']):
        sys.exit('컷 키는 앞자리 0이 없는 양의 정수 문자열이어야 합니다.')
    cuts = {int(k): v for k, v in data['cuts'].items()}
    if not cuts:
        sys.exit('컷이 0개다')

    ps = load_preset(args.preset)
    check_preset(ps)

    modes = ps['modes']
    V = len(modes) if args.variants is None else args.variants
    if not 1 <= V <= 100:
        sys.exit('변형 수는 1~100이어야 합니다.')
    if len(cuts) * V > 10000:
        sys.exit('총 슬롯은 10000개 이하여야 합니다. 프로젝트를 나눠 주세요.')
    if any(n < 1 or n > 999 for n in cuts):
        sys.exit('레퍼 번호는 1~999이어야 합니다.')
    if any(not isinstance(c, dict) or not isinstance(c.get('entity'), str) or not c['entity'].strip() for c in cuts.values()):
        sys.exit('모든 컷에 entity(이미지를 보고 쓴 영어 설명)를 채워 주세요.')
    M = len(modes)
    maxcut = max(cuts)
    stride = max(10, int(math.ceil(maxcut / 10.0) * 10))

    # 컷 종류가 프리셋에 없는 값이면 여기서 잡는다
    unknown = sorted({c['kind'] for c in cuts.values()} - set(ps['kinds']))
    if unknown:
        sys.exit(f"cuts.json 의 kind 값이 프리셋에 없다: {unknown}\n"
                 f"프리셋 '{ps['name']}' 이 아는 종류: {ps['kinds']}")

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
                sys.exit(f"조합 용량 초과: 컷 {n}, 모드 {mode['letter']}. 컷/변형 수를 줄이거나 축을 늘려 주세요. 출력은 저장하지 않았습니다.")
            used.add(chosen[0])
            slot = n + i * stride
            prompts[slot] = build_one(ps, cut, mode, chosen[1], args.aspect)
            labels[slot] = f"{cut['slug']}_{mode['letter']}{p + 1}"

    # ── 검사 ────────────────────────────────────────────────────
    combos = set()
    for slot, txt in prompts.items():
        j = json.loads(txt.split('\n', 1)[1])
        combos.add((j['camera'], j['time_and_weather'], j['colour_grade'],
                    j['composition']['structure'], j['moment'], j['finish']))
    lens = [len(v) for v in prompts.values()]

    print(f"\n프리셋   {ps['name']} — {ps['title']}")
    print(f"컷       {len(cuts)}개 (최대 번호 {maxcut}) · stride {stride}")
    print(f"변형     {V}개/컷 · 모드 {M}종" + (f" (모드를 {math.ceil(V/M)}바퀴 돌린다)" if V > M else ""))
    print(f"슬롯     {len(prompts)}개 · 번호 {min(prompts)}~{max(prompts)}")
    print(f"글자수   {min(lens)} ~ {max(lens)}")
    print(f"고유조합 {len(combos)} / {len(prompts)}" + ('  ✓' if len(combos) == len(prompts) else '  ✗ 중복 있음'))
    if collisions:
        print(f"         (조합 충돌 {collisions}회를 유한 조합 탐색으로 해결했다)")

    for axis, get in (('카메라', lambda j: j['camera']),
                      ('시간/날씨', lambda j: j['time_and_weather']),
                      ('그레이딩', lambda j: j['colour_grade']),
                      ('구도', lambda j: j['composition']['structure']),
                      ('순간', lambda j: j['moment']),
                      ('마감', lambda j: j['finish'])):
        vals = [get(json.loads(v.split('\n', 1)[1])) for v in prompts.values()]
        c = Counter(vals)
        print(f'  {axis:<9} {len(c):>3}종 · 최다 {c.most_common(1)[0][1]}회')

    # 슬롯 → 레퍼 역산이 맞는가
    wrong = [s for s in prompts if ((s - 1) % stride) + 1 not in cuts]
    if wrong:
        print(f'  ✗ 레퍼 역산 실패 슬롯: {wrong[:5]}')
        sys.exit(1)
    print('  ✓ 모든 슬롯이 레퍼 번호로 되돌아온다')

    gaps = [n for n in range(1, maxcut + 1) if n not in cuts]
    if gaps:
        print(f'  번호 공백 {gaps}: 존재하는 컷만 생성합니다. 슬롯 역산은 유지됩니다.')
    else:
        print(f'  ✓ 레퍼 번호 1~{maxcut} 연속')

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
        sys.exit('프롬프트 파일이 20MB를 넘습니다. 컷/변형을 나눠 주세요. 기존 출력은 유지합니다.')
    write_json(out, payload)
    print(f'\n저장: {out}  ({os.path.getsize(out)//1024} KB)')
    print('다음 단계: build_console.py로 프롬프트가 내장된 실행 JS를 만드세요. JSON은 콘솔에 붙여넣지 않습니다.\n')


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except (ValueError, KeyError, OSError, TypeError) as exc:
        sys.exit(str(exc))
