"""Run with Python; all inputs and outputs are isolated temporary files."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('scan_refs', SCRIPTS / 'scan_refs.py')
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)


class ToolingTest(unittest.TestCase):
    def test_failed_build_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, output = root / 'spec.json', root / 'console.js'
            output.write_text('previous working script', encoding='utf-8')
            source.write_text(json.dumps({'prompts': {'1': ''}}), encoding='utf-8')
            run = subprocess.run([sys.executable, str(SCRIPTS / 'build_console.py'), str(source), '--reference', 'none', '--out', str(output)], capture_output=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertEqual(output.read_text(), 'previous working script')

    def test_rename_preserves_extension_and_detects_collision(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'Original.PNG'
            source.write_bytes(b'original')
            plan = scanner.rename_plan([source])
            self.assertEqual(plan[0][1].suffix, '.PNG')
            self.assertTrue(source.exists())
            plan[0][1].write_bytes(b'existing')
            with self.assertRaises(ValueError):
                scanner.apply_renames(plan)
            self.assertEqual(source.read_bytes(), b'original')
            self.assertEqual(plan[0][1].read_bytes(), b'existing')

    def test_three_modes_build_with_unicode_and_literal_js_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for mode in ('none', 'manual', 'folder'):
                source, output = root / 'spec.json', root / (mode + '.js')
                source.write_text(json.dumps({'project': '검증', 'stride': 10, 'prompts': {'1': '한글 ` ${literal} </script>\nsecond line'}}), encoding='utf-8')
                run = subprocess.run([sys.executable, str(SCRIPTS / 'build_console.py'), str(source), '--reference', mode, '--out', str(output)], capture_output=True)
                self.assertEqual(run.returncode, 0, run.stderr)
                self.assertTrue(output.stat().st_size > 1000)


if __name__ == '__main__':
    unittest.main()
