"""Build one pasteable project script, with serialized prompts already included."""
import argparse
import json
import re
import os
import tempfile
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('spec', type=Path)
    parser.add_argument('--reference', choices=['manual', 'folder', 'none'], required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--infinite', action='store_true')
    parser.add_argument('--shuffle', action='store_true')
    args = parser.parse_args()
    spec = json.loads(args.spec.read_text(encoding='utf-8-sig'))
    if not isinstance(spec, dict) or not isinstance(spec.get('prompts'), dict) or not spec['prompts']:
        parser.error('Nonempty prompts object required.')
    if any(not isinstance(v, str) or not v.strip() for v in spec['prompts'].values()):
        parser.error('Every prompt must be a nonempty string.')
    stride = spec.get('stride', 30)
    if type(stride) is not int or not 1 <= stride <= 1000:
        parser.error('stride must be an integer from 1 to 1000.')
    if spec.get('schema_version', 1) != 1 or len(spec['prompts']) > 10000:
        parser.error('Unsupported schema or too many prompts.')
    refs = set()
    for key, prompt in spec['prompts'].items():
        if not re.fullmatch(r'[1-9][0-9]*', key) or int(key) > 1000000 or len(prompt) > 100000:
            parser.error('Invalid prompt slot or length: ' + key)
        refs.add(1 if args.reference == 'none' else (int(key) - 1) % stride + 1)
    if max(refs) > 999 or (args.reference == 'manual' and len(refs) != 1):
        parser.error('manual requires one reference group; reference IDs must be 1-999.')
    if not isinstance(spec.get('labels', {}), dict) or any(not isinstance(v, str) for v in spec.get('labels', {}).values()):
        parser.error('labels must map slot numbers to strings.')
    if not isinstance(spec.get('project', ''), str):
        parser.error('project must be a string.')
    spec['mode'] = 'PROMPT_ONLY' if args.reference == 'none' else 'WITH_REF'
    spec.setdefault('aspect', 'site')  # Metadata only; runtime follows site settings.
    assets = Path(__file__).resolve().parents[1] / 'assets'
    config = dict(spec=spec, reference=args.reference, infinite=args.infinite, shuffle=args.shuffle)
    # Serialize as a literal, never interpolate prompts into hand-written template strings.
    output = ('(function(){\n"use strict";\nconst module = {exports:{}};\n'
              + (assets/'engine.js').read_text(encoding='utf-8') + '\n('
              + (assets/'console-panel.js').read_text(encoding='utf-8')
              + ')(module.exports,' + json.dumps(config, ensure_ascii=True) + ');\n})();\n')
    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Replace only after the complete script is written. A failed build preserves
    # the user's previous working file.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=args.out.parent, suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(output)
        os.replace(temporary, args.out)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    print('Created embedded console script: ' + str(args.out))

if __name__ == '__main__':
    main()
