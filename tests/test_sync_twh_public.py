import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_twh_public as sync


class PublicDocsTests(unittest.TestCase):
    @staticmethod
    def url(n):
        return sync.BLOB_PREFIX + f"form_{n}.pdf"

    @classmethod
    def files(cls, numbers=range(40)):
        return [sync.PublicFile(f"Official document {n}", cls.url(n)) for n in numbers]

    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.forms = root / "forms.html"
        self.search = root / "search-index.json"
        self.state = root / "troopwebhost-public-state.json"
        old = "".join(
            '<li class="doc-item"><a href="' + self.url(n)
            + '" target="_blank" rel="noopener noreferrer">'
            + '<span class="file-icon">PDF</span><span>Legacy document '
            + str(n) + '</span><span aria-hidden="true">↗</span></a></li>'
            for n in range(40)
        )
        external = (
            '<li class="doc-item"><a href="https://www.scouting.org/test.pdf">'
            '<span class="file-icon">PDF</span><span>National form</span></a></li>'
        )
        self.forms.write_text(
            '<div class="stat-strip" data-reveal><div><strong>41</strong></div></div>'
            '<span class="result-count" id="doc-count" role="status" aria-live="polite">'
            '41 public documents</span>'
            '<p>9 organized categories · Original PDF links retained</p>'
            '<section><details class="doc-group"><summary><span>General documents '
            '<small>41 documents</small></span></summary><ul class="doc-items">'
            + old + external + '</ul></details></section><section class="banner-cta"></section>',
            encoding="utf-8",
        )
        self.search.write_text(json.dumps({"updated": "2026-11-01", "items": []}), encoding="utf-8")
        patches = [
            patch.object(sync, "FORM_FILE", self.forms),
            patch.object(sync, "SEARCH_FILE", self.search),
            patch.object(sync, "STATE_FILE", self.state),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def rendered_urls(self):
        return sync._document_links(self.forms.read_text(encoding="utf-8"))

    def test_anonymous_parser_only_accepts_public_troop_710_urls(self):
        sample = """
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/new.pdf">New public form</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop123/secret.pdf">Wrong troop</a>
          <a href="http://troopwebhost.blob.core.windows.net/troop710haciendaheights/insecure.pdf">Insecure</a>
          <a href="javascript:alert(1)">Untrusted</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/program.exe">Executable</a>
          <a href="https://troopwebhost.blob.core.windows.net/troop710haciendaheights/roster.pdf">Member roster</a>
        """
        parsed = sync.extract_public_files(sample)
        self.assertEqual([f.title for f in parsed], ["New public form"])

    def test_new_upload_adds_once_and_search_index_matches(self):
        source = self.files() + [sync.PublicFile('Example <script>alert(1)</script>', self.url(40))]
        added, removed, changed = sync.sync(source)
        self.assertEqual((added, removed, changed), (1, 0, True))
        self.assertIn("&lt;script&gt;", self.forms.read_text(encoding="utf-8"))
        self.assertEqual(len(self.rendered_urls()), 42)  # 41 hosted + 1 national resource
        index = json.loads(self.search.read_text(encoding="utf-8"))
        self.assertEqual(len([x for x in index["items"] if x["kind"] == "document"]), 42)
        self.assertTrue(self.state.exists())
        self.assertEqual(sync.sync(source), (1, 0, False))

    def test_removed_file_needs_two_healthy_public_reads(self):
        sync.sync(self.files())
        current = self.files(range(39))
        _, removed, changed = sync.sync(current)
        self.assertEqual(removed, 0)
        self.assertTrue(changed)
        self.assertIn(self.url(39), self.rendered_urls())
        _, removed, changed = sync.sync(current)
        self.assertEqual(removed, 1)
        self.assertTrue(changed)
        self.assertNotIn(self.url(39), self.rendered_urls())
        self.assertIn("https://www.scouting.org/test.pdf", self.rendered_urls())
        self.assertNotIn(self.url(39), [
            x["url"] for x in json.loads(self.search.read_text(encoding="utf-8"))["items"]
            if x.get("kind") == "document"
        ])

    def test_replacement_adds_new_and_removes_old(self):
        sync.sync(self.files())
        replacement = self.files(range(1, 40)) + [sync.PublicFile("Updated document", self.url(99))]
        sync.sync(replacement)
        self.assertIn(self.url(0), self.rendered_urls())
        self.assertIn(self.url(99), self.rendered_urls())
        sync.sync(replacement)
        self.assertNotIn(self.url(0), self.rendered_urls())
        self.assertIn(self.url(99), self.rendered_urls())
        self.assertIn("Updated document", self.forms.read_text(encoding="utf-8"))

    def test_official_title_change_updates_existing_category(self):
        sync.sync(self.files())
        changed = self.files()
        changed[0] = sync.PublicFile("Renamed official form", self.url(0))
        sync.sync(changed)
        self.assertEqual(self.rendered_urls()[self.url(0)], "Renamed official form")
        self.assertEqual(sync.sync(changed), (0, 0, False))

    def test_lost_public_page_aborts_without_changes(self):
        sync.sync(self.files())
        prior = [p.read_text(encoding="utf-8") for p in [self.forms, self.search, self.state]]
        with self.assertRaises(ValueError):
            sync.sync(self.files(range(25)))  # Too many files lost to safely remove
        self.assertEqual(prior, [p.read_text(encoding="utf-8") for p in [self.forms, self.search, self.state]])
        with self.assertRaises(ValueError):
            sync.sync(self.files(range(10)))  # Below the minimum public page threshold

    def test_bad_html_aborts_without_writing(self):
        self.forms.write_text("<html>unsupported</html>", encoding="utf-8")
        with self.assertRaises(ValueError):
            sync.sync(self.files())
        self.assertEqual(self.forms.read_text(encoding="utf-8"), "<html>unsupported</html>")
        self.assertFalse(self.state.exists())


if __name__ == "__main__":
    unittest.main()
