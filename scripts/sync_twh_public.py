#!/usr/bin/env python3
"""Sync ONLY anonymously visible TroopWebHost public document links to the static site.

No login, member data, Azure credentials, or file copies are used.
An incomplete/changed source page fails closed and leaves the website untouched.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PORTAL = "https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"
PUBLIC_FORMS = "https://www.troopwebhost.org/Troop710HaciendaHeights/bsaShowTroopForms.aspx?Menu_Item_ID=45870&Stack=1"
BLOB_PREFIX = "https://troopwebhost.blob.core.windows.net/troop710haciendaheights/"
FORM_FILE = ROOT / "forms.html"
SEARCH_FILE = ROOT / "search-index.json"
START = "<!-- BEGIN TWH PUBLIC UPLOADS -->"
END = "<!-- END TWH PUBLIC UPLOADS -->"
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png"}
BLOCKED_TITLES = re.compile(
    r"(?i)\b(?:confidential|member roster|personal record|completed medical|"
    r"social security|passport copy|bank statement|birth certificate)\b"
)


@dataclass(frozen=True)
class PublicFile:
    title: str
    url: str


def approved_url(raw: str, base_url: str = PUBLIC_FORMS) -> str | None:
    url = urljoin(base_url, raw.strip())
    parts = urlsplit(url)
    if parts.scheme != "https" or not url.lower().startswith(BLOB_PREFIX):
        return None
    if Path(unquote(parts.path)).suffix.lower() not in ALLOWED_EXTENSIONS:
        return None
    return url


def extract_public_files(source_html: str) -> list[PublicFile]:
    """Parse only the explicitly public directory viewed without login."""
    soup = BeautifulSoup(source_html, "html.parser")
    result: dict[str, PublicFile] = {}
    for link in soup.select("a[href]"):
        url = approved_url(link.get("href", ""))
        if not url:
            continue
        filename = Path(unquote(urlsplit(url).path)).stem
        title = " ".join(link.stripped_strings).strip()
        if len(title) < 4 or title.lower() in {"view", "download", "open", "pdf"}:
            title = filename.replace("_", " ")
        title = re.sub(r"\s+", " ", title)[:180]
        if BLOCKED_TITLES.search(title) or not title:
            continue
        result.setdefault(url, PublicFile(title, url))
    return sorted(result.values(), key=lambda x: (x.title.casefold(), x.url))


async def fetch_anonymous_directory() -> str:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        try:
            await page.goto(PORTAL, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(2500)  # TroopWebHost enters the ASP.NET app via redirect/POST.
            links = page.locator("a").filter(has_text=re.compile(r"Forms\s*&\s*Documents", re.I))
            if await links.count():
                try:
                    await links.first.click(timeout=12000)
                except Exception:
                    await page.goto(PUBLIC_FORMS, wait_until="domcontentloaded", timeout=60000)
            else:
                await page.goto(PUBLIC_FORMS, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(3500)
            return await page.content()
        finally:
            await browser.close()


def write_if_changed(path: Path, content: str) -> bool:
    if path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def sync(source: list[PublicFile]) -> tuple[int, bool]:
    html = FORM_FILE.read_text(encoding="utf-8")
    # Always regenerate just our own area. Never touch the 48 curated baseline links.
    html = re.sub(re.escape(START) + r".*?" + re.escape(END), "", html, flags=re.S)
    base_soup = BeautifulSoup(html, "html.parser")
    existing = {
        link.get("href")
        for link in base_soup.select("li.doc-item a[href]")
    }
    newly_published = [file for file in source if file.url not in existing]
    if len(newly_published) > 100:
        raise ValueError("Over 100 new documents: refusing large unreviewed public update")

    block = ""
    if newly_published:
        entries = []
        for file in newly_published:
            label = Path(urlsplit(file.url).path).suffix.lstrip(".").upper()
            entries.append(
                '<li class="doc-item"><a href="' + escape(file.url, quote=True)
                + '" target="_blank" rel="noopener noreferrer"><span class="file-icon">'
                + escape(label) + "</span><span>" + escape(file.title)
                + '</span><span aria-hidden="true">↗</span></a></li>'
            )
        block = (
            "\n" + START + '\n<details data-reveal class="doc-group"><summary><span>'
            + "Latest public uploads <small>" + str(len(entries))
            + ' documents</small></span></summary><ul class="doc-items">'
            + "".join(entries) + "</ul></details>\n" + END + "\n"
        )
    anchor = '</details></section><section class="banner-cta"'
    if anchor not in html:
        raise ValueError("Forms page layout changed; refusing to modify")
    html = html.replace(anchor, "</details>" + block + '</section><section class="banner-cta"', 1)
    count = len(base_soup.select("li.doc-item")) + len(newly_published)
    if count < 40:
        raise ValueError("Rendered library unexpectedly small")
    html, changed = re.subn(
        r'(<div class="stat-strip" data-reveal><div><strong>)\d+(</strong>)',
        lambda match: match.group(1) + str(count) + match.group(2),
        html, count=1,
    )
    if changed != 1:
        raise ValueError("Missing public document counter")
    html = re.sub(
        r'(<span class="result-count" id="doc-count" role="status" aria-live="polite">)\d+',
        lambda match: match.group(1) + str(count), html, count=1
    )
    html = re.sub(
        r'\d+ organized categories · (?:Original PDF links retained|Original file links retained)',
        str(9 + bool(newly_published)) + ' organized categories · Original file links retained',
        html, count=1,
    )

    index = json.loads(SEARCH_FILE.read_text(encoding="utf-8"))
    items = [x for x in index["items"] if x.get("source") != "troopwebhost-sync"]
    for file in newly_published:
        items.append({
            "kind": "document", "title": file.title, "subtitle": "Forms & Documents · Latest public uploads",
            "url": file.url, "keywords": "troop 710 public documents forms downloads",
            "source": "troopwebhost-sync"
        })
    if items != index["items"]:
        index["items"] = items
        index["updated"] = date.today().isoformat()
    serialized = json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n"
    changed_html = write_if_changed(FORM_FILE, html)
    changed_index = write_if_changed(SEARCH_FILE, serialized)
    return len(newly_published), changed_html or changed_index


def main() -> None:
    import asyncio

    parser = argparse.ArgumentParser()
    parser.add_argument("--html-file", type=Path, help="Use saved public HTML for offline testing")
    parser.add_argument("--min-documents", type=int, default=35)
    args = parser.parse_args()
    source_html = args.html_file.read_text(encoding="utf-8") if args.html_file else asyncio.run(fetch_anonymous_directory())
    documents = extract_public_files(source_html)
    if len(documents) < args.min_documents:
        raise SystemExit(
            "Public directory returned only " + str(len(documents))
            + " approved files (need " + str(args.min_documents)
            + "); website unchanged. Confirm TroopWebHost's public markup/session path."
        )
    count, changed = sync(documents)
    print(str(len(documents)) + " public troop-hosted files found; " + str(count)
          + " additional files indexed; website " + ("updated" if changed else "unchanged") + ".")


if __name__ == "__main__":
    main()
