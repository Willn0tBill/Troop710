import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_twh_public as sync


class PublicDocsTests(unittest.TestCase):
    def test_anonymous_parser_only_accepts_troop_710_files(self):
        sample = """
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/new.pdf">New public form</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop123/secret.pdf">Wrong troop</a>
          <a href="http://troopwebhost.blob.core.windows.net/troop710haciendaheights/insecure.pdf">Insecure</a>
          <a href="javascript:alert(1)">Untrusted</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/program.exe">Executable</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/roster.pdf">Member roster</a>
        """
        files = sync.extract_public_files(sample)
        self.assertEqual([file.title for file in files], ["New public form"])

    def test_sync_keeps_existing_links_and_is_idempotent(self):
        with TemporaryDirectory() as td:
            root = Path(td)
            old = "".join(
                '<li class="doc-item"><a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/old'
                + str(i) + '.pdf">Existing</a></li>'
                for i in range(40)
            )
            html = (
                '<div class="stat-strip" data-reveal><div><strong>40</strong></div></div>'
                '<span class="result-count" id="doc-count" role="status" aria-live="polite">40 public documents</span>'
                '<p>9 organized categories · Original PDF links retained</p>'
                '<section><details class="doc-group"><summary>General documents</summary><ul>'
                + old + '</ul></details></section><section class="banner-cta"></section>'
            )
            forms = root / "forms.html"
            forms.write_text(html, encoding="utf-8")
            search = root / "search-index.json"
            search.write_text(json.dumps({"updated": "2026-11-01", "items": []}), encoding="utf-8")
            public = [sync.PublicFile('Example <script>alert(1)</script>', sync.BLOB_PREFIX + 'new.pdf')]
            with patch.object(sync, "FORM_FILE", forms), patch.object(sync, "SEARCH_FILE", search):
                n, changed = sync.sync(public)
                self.assertEqual((n, changed), (1, True))
                self.assertIn("&lt;script&gt;", forms.read_text(encoding="utf-8"))
                self.assertEqual(forms.read_text(encoding="utf-8").count('class="doc-item"'), 41)
                self.assertEqual(len(json.loads(search.read_text(encoding="utf-8"))["items"]), 1)
                n, changed = sync.sync(public)
                self.assertEqual((n, changed), (1, False))

    def test_bad_html_aborts_without_writing(self):
        with TemporaryDirectory() as td:
            forms = Path(td) / "forms.html"
            search = Path(td) / "search-index.json"
            forms.write_text("<html>unsupported</html>", encoding="utf-8")
            search.write_text('{"items":[]}', encoding="utf-8")
            with patch.object(sync, "FORM_FILE", forms), patch.object(sync, "SEARCH_FILE", search):
                with self.assertRaises(ValueError):
                    sync.sync([sync.PublicFile("Hello", sync.BLOB_PREFIX + "new.pdf")])
            self.assertEqual(forms.read_text(encoding="utf-8"), "<html>unsupported</html>")


if __name__ == "__main__":
    unittest.main()
