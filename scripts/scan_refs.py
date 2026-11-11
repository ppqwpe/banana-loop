#!/usr/bin/env python3
"""Inspect references, preserve metadata, and apply explicit collision-safe renames."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import uuid

EXT = {'.jpg', '.jpeg', '.png', '.webp'}
NAME_RX = re.compile(r'^(\d{1,3})_(.+)\.(jpe?g|png|webp)$', re.I)


def write_json(path, data):
    path = Path(path)
    tmp = path.with_name(path.name + '.tmp-' + uuid.uuid4().hex)
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


def guess_kind(slug, rules, kinds, default):
    return next((k for k in kinds if any(w.lower() in slug.lower()
                 for w in rules.get(k, []))), default)


def sha(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def rename_plan(files, renumber=False):
    parsed = [(p, NAME_RX.match(p.name)) for p in files]
    ids = [int(m[1]) for _, m in parsed if m]
    if not renumber and (len(ids) != len(set(ids)) or any(n < 1 for n in ids)):
        raise ValueError('번호 중복/0번이 있습니다. --renumber로 전체 변경안을 확인하세요.')
    next_id = max(ids, default=0) + 1
    parsed.sort(key=lambda pair: (int(pair[1][1]) if pair[1] else 1000, pair[0].name.casefold()))
    plan = []
    for index, (path, match) in enumerate(parsed, 1):
        if renumber:
            number = index
        elif match:
            continue
        else:
            number = next_id
            next_id += 1
        if not 1 <= number <= 999:
            raise ValueError('레퍼 번호는 1~999까지 지원합니다.')
        slug = match[2] if match else path.stem
        slug = re.sub(r'[^\w가-힣-]+', '_', slug).strip('_') or 'cut'
        target = path.with_name(f'{number:02d}_{slug}{path.suffix}')
        if target != path:
            plan.append((path, target))
    return plan


def apply_renames(plan):
    sources = {str(src).casefold() for src, _ in plan}
    targets = [str(dst).casefold() for _, dst in plan]
    if len(targets) != len(set(targets)):
        raise ValueError('변경 대상 이름이 중복됩니다.')
    for _, target in plan:
        if target.exists() and str(target).casefold() not in sources:
            raise ValueError(f'기존 파일을 덮어쓸 수 없습니다: {target.name}')
    staged, committed = [], []
    try:
        for source, target in plan:
            temp = source.with_name('.hf-rename-' + uuid.uuid4().hex)
            source.rename(temp)
            staged.append((source, temp, target))
        for source, temp, target in staged:
            if target.exists():
                raise ValueError(f'작업 중 대상 파일이 생겼습니다: {target.name}')
            temp.rename(target)
            committed.append((source, temp, target))
    except Exception:
        for source, temp, target in reversed(committed):
            target.rename(temp)
        for source, temp, _ in reversed(staged):
            if temp.exists():
                temp.rename(source)
        raise


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('folder', type=Path)
    ap.add_argument('--preset', default='industrial')
    ap.add_argument('--out', type=Path)
    ap.add_argument('--rename', action='store_true', help='규칙 미준수 파일의 변경안만 출력')
    ap.add_argument('--renumber', action='store_true', help='전체 파일을 1..N으로 다시 번호 지정')
    ap.add_argument('--apply', action='store_true', help='이름 변경안 실행')
    args = ap.parse_args()
    if args.apply and not (args.rename or args.renumber):
        ap.error('--apply에는 --rename 또는 --renumber가 필요합니다.')
    folder = args.folder.expanduser().resolve()
    if not folder.is_dir():
        ap.error('이미지 폴더가 없습니다.')
    preset_path = Path(args.preset)
    if not preset_path.is_file():
        preset_path = Path(__file__).parent / 'axes' / (args.preset + '.json')
    spec = json.loads(preset_path.read_text(encoding='utf-8-sig'))
    out = args.out or folder / 'cuts.json'
    old = json.loads(out.read_text(encoding='utf-8-sig')) if out.exists() else {}
    previous = {cut['file']: cut for cut in old.get('cuts', {}).values()}
    files = sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXT),
                   key=lambda p: p.name.casefold())
    if not files:
        ap.error('지원하는 이미지 파일이 없습니다.')
    if len(files) > 999:
        ap.error('한 폴더에서 최대 999장까지 지원합니다.')
    if args.rename or args.renumber:
        plan = rename_plan(files, args.renumber)
        for source, target in plan:
            print(f'{source.name} -> {target.name}')
        if not args.apply:
            print(f'변경안 {len(plan)}개. 파일 및 cuts.json은 변경하지 않았습니다. --apply로 실행하세요.')
            return
        apply_renames(plan)
        mapping = {src.name: dst.name for src, dst in plan}
        previous = {mapping.get(name, name): cut for name, cut in previous.items()}
        files = sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXT),
                       key=lambda p: p.name.casefold())
    cuts, problems = {}, []
    for path in files:
        match = NAME_RX.match(path.name)
        if not match or not 1 <= int(match[1]) <= 999:
            problems.append(f'파일명 규칙 오류: {path.name}')
            continue
        number, slug = int(match[1]), match[2]
        if str(number) in cuts:
            problems.append(f'번호 {number} 중복: {cuts[str(number)]["file"]}, {path.name}')
            continue
        cut = dict(previous.get(path.name, {}))
        cut.update(file=path.name, slug=slug)
        if cut.get('kind') not in spec['kinds']:
            cut['kind'] = guess_kind(slug, spec.get('kind_rules', {}), spec['kinds'],
                                     spec.get('default_kind', spec['kinds'][-1]))
        cuts[str(number)] = cut
    if problems:
        raise ValueError('\n'.join(problems) + '\ncuts.json은 변경하지 않았습니다.')
    seen = {}
    try:
        from PIL import Image
    except ImportError:
        Image = None
        print('참고: Pillow 미설치로 해상도 검사를 생략합니다. pip install Pillow')
    for cut in cuts.values():
        path = folder / cut['file']
        digest = sha(path)
        if digest in seen:
            print(f'내용 동일: {path.name} / {seen[digest]}')
        seen[digest] = path.name
        if Image:
            with Image.open(path) as im:
                cut['size'] = list(im.size)
    gaps = sorted(set(range(1, max(map(int, cuts)) + 1)) - set(map(int, cuts)))
    if gaps:
        print(f'번호 공백: {gaps}. 엔진은 공백을 지원합니다. 연속 번호가 필요하면 --renumber를 쓰세요.')
    payload = {'folder': str(folder), 'preset': spec['name'],
               'cuts': dict(sorted(cuts.items(), key=lambda pair: int(pair[0])))}
    write_json(out, payload)
    print(f'저장: {out} / {len(cuts)}컷. 이미지를 보고 entity를 영어로 채워 주세요.')


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except (ValueError, OSError, KeyError) as exc:
        sys.exit(str(exc))
