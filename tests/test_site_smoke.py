"""Browser smoke tests for the static Troop 710 site.

Run against the checked-out site, not an unrelated production deployment.
Tests do not upload files or access member-only troop information.
"""
from __future__ import annotations

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


@contextmanager
def local_site():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield "http://127.0.0.1:" + str(server.server_address[1]) + "/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


class WebsiteSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = local_site()
        cls.base_url = cls.server.__enter__()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.__exit__(None, None, None)

    def new_page(self, **context_args):
        context = self.browser.new_context(**context_args)
        self.addCleanup(context.close)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        return page, errors

    def visit(self, page, path):
        page.goto(self.base_url + path, wait_until="domcontentloaded", timeout=45000)
        page.locator("main").wait_for(timeout=12000)

    def test_mobile_navigation_and_layout(self):
        page, errors = self.new_page(viewport={"width": 390, "height": 760}, is_mobile=True)
        self.visit(page, "index.html")
        self.assertTrue(page.get_by_role("heading", name="Adventure starts here.").count())
        menu = page.locator(".menu-button")
        menu.click()
        self.assertEqual(page.locator(".nav").get_attribute("data-open"), "true")
        self.assertTrue(page.locator(".nav a[href='forms.html']").is_visible())
        page.keyboard.press("Escape")
        self.assertEqual(page.locator(".nav").get_attribute("data-open"), "false")
        for path in ("index.html", "forms.html", "toolkit.html"):
            self.visit(page, path)
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth - window.innerWidth"
            )
            self.assertLessEqual(overflow, 3, path + " has horizontal overflow")
        self.assertEqual(errors, [])

    def test_public_forms_search_and_other_public_files(self):
        page, errors = self.new_page(viewport={"width": 1280, "height": 800})
        self.visit(page, "forms.html")
        page.locator("#doc-search").fill("Eagle")
        clear = page.get_by_role("button", name="Clear document search")
        self.assertTrue(clear.is_visible())
        self.assertIn("public document", page.locator("#doc-count").inner_text())
        clear.click()
        self.assertEqual(page.locator("#doc-search").input_value(), "")
        self.assertFalse(clear.is_visible())
        page.get_by_role("button", name="Other public files", exact=False).click()
        self.assertTrue(page.locator("#doc-count").inner_text().startswith("2 public documents"))
        self.assertEqual(errors, [])

    def test_site_search_finds_document_from_home(self):
        page, errors = self.new_page(viewport={"width": 1280, "height": 800})
        self.visit(page, "index.html")
        page.keyboard.press("Control+k")
        dialog = page.locator("#t710-search-dialog")
        self.assertTrue(dialog.is_visible())
        page.locator("#t710-search-input").fill("Eagle")
        page.locator(".t710-search-dialog__result").first.wait_for(timeout=10000)
        self.assertGreater(page.locator(".t710-search-dialog__result").count(), 0)
        page.keyboard.press("Escape")
        self.assertFalse(dialog.is_visible())
        self.assertEqual(errors, [])

    def test_reduced_motion_default_and_manual_override(self):
        page, errors = self.new_page(
            viewport={"width": 1280, "height": 800}, reduced_motion="reduce"
        )
        self.visit(page, "index.html")
        self.assertFalse(page.locator("html").evaluate("(el) => el.classList.contains('motion-enabled')"))
        page.locator("[data-preferences-trigger]").click()
        page.locator('[data-motion-option="on"]').click()
        self.assertTrue(page.locator("html").evaluate("(el) => el.classList.contains('motion-enabled')"))
        self.visit(page, "forms.html")
        self.assertTrue(page.locator("html").evaluate("(el) => el.classList.contains('motion-enabled')"))
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
