#!/usr/bin/env python3
"""Sync ONLY anonymously visible TroopWebHost public document links to the static site.

No login, member data, Azure credentials, or file copies are used.
An incomplete/changed source page fails closed and leaves the website untouched.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date
from html import escape, unescape
import json
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PORTAL = "https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"
PUBLIC_FORMS = "https://www.troopwebhost.org/bsaShowTroopForms.aspx?Menu_Item_ID=45870&Stack=1"
BLOB_PREFIX = "https://troopwebhost.blob.core.windows.net/troop710haciendaheights/"
FORM_FILE = ROOT / "forms.html"
SEARCH_FILE = ROOT / "search-index.json"
STATE_FILE = ROOT / "troopwebhost-public-state.json"
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
            app_frames = [f for f in page.frames if f is not page.main_frame]
            if not app_frames:
                raise RuntimeError("TroopWebHost did not load its public application frame")
            frame = app_frames[-1]
            print("Anonymous TroopWebHost application: " + frame.url)
            links = frame.locator("a").filter(has_text=re.compile(r"Forms\s*&\s*Documents", re.I))
            if await links.count():
                try:
                    await links.first.click(timeout=12000)
                except Exception:
                    await frame.goto(PUBLIC_FORMS, wait_until="domcontentloaded", timeout=60000)
            else:
                await frame.goto(PUBLIC_FORMS, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(2500)
            print("Public directory frame: " + frame.url + " | " + await frame.title())
            html = await frame.content()
            return html
        finally:
            await browser.close()


def write_if_changed(path: Path, content: str) -> bool:
    if path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def _render_upload(file: PublicFile) -> str:
    label = Path(unquote(urlsplit(file.url).path)).suffix.lstrip(".").upper()
    return (
        '<li class="doc-item"><a href="' + escape(file.url, quote=True)
        + '" target="_blank" rel="noopener noreferrer"><span class="file-icon">'
        + escape(label) + "</span><span>" + escape(file.title)
        + '</span><span aria-hidden="true">↗</span></a></li>'
    )


def _read_state() -> dict:
    if not STATE_FILE.exists():
        return {"version": 1, "known": {}, "missing": {}}
    state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    if state.get("version") != 1 or not isinstance(state.get("known"), dict) or not isinstance(state.get("missing"), dict):
        raise ValueError("Document sync state is invalid; refusing to publish")
    if any(not approved_url(u) for u in state["known"]):
        raise ValueError("Document sync state has unapproved URLs")
    return state


def _document_links(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    result: dict[str, str] = {}
    for item in soup.select("li.doc-item"):
        link = item.select_one("a[href]")
        if link is not None:
            url = unescape(link.get("href", ""))
            label = link.select_one("span:nth-child(2)")
            result[url] = label.get_text(" ", strip=True) if label else link.get_text(" ", strip=True)
    return result


def _update_legacy(
    match: re.Match[str],
    active: dict[str, PublicFile],
    missing: dict[str, int],
    previous: dict[str, str],
) -> str:
    """Keep curated categories; reconcile only the TroopWebHost-managed entries."""
    block = match.group(0)
    url_match = re.search(r'<a href="([^"]+)"', block)
    if url_match is None:
        return block
    url = unescape(url_match.group(1))
    if not url.startswith(BLOB_PREFIX):
        return block  # Keep external Scouting America references unchanged.
    if url not in active:
        return ""  # No longer in the public listing: unpublish immediately.
    # Avoid rewriting hand-edited historical display names on the initial bootstrap.
    # On later runs an actual TroopWebHost title change propagates to the old category.
    if url not in previous or previous[url] == active[url].title:
        return block
    return re.sub(
        r'(<span class="file-icon">[^<]*</span><span>)[\s\S]*?(</span>)',
        lambda m: m.group(1) + escape(active[url].title) + m.group(2),
        block, count=1,
    )


def _update_counts(html: str) -> tuple[str, int]:
    """Recompute each folder count, page totals, and responsive search counter."""
    def update_group(match: re.Match[str]) -> str:
        block = match.group(0)
        count = len(re.findall(r'<li class="doc-item">', block))
        return re.sub(
            r'(<summary><span>[^<]+<small>)\d+( documents?</small>)',
            lambda m: m.group(1) + str(count) + m.group(2),
            block, count=1,
        )
    html = re.sub(r'<details\b[^>]*class="doc-group"[^>]*>[\s\S]*?</details>',
                  update_group, html)
    soup = BeautifulSoup(html, "html.parser")
    count = len(soup.select("li.doc-item"))
    group_count = sum(bool(group.select("li.doc-item")) for group in soup.select("details.doc-group"))
    if count < 35:
        raise ValueError("Rendered public library unexpectedly small; refusing to publish")
    html, replaced = re.subn(
        r'(<div class="stat-strip" data-reveal><div><strong>)\d+(</strong>)',
        lambda m: m.group(1) + str(count) + m.group(2),
        html, count=1,
    )
    if replaced != 1:
        raise ValueError("Public document statistic missing; refusing to publish")
    html, replaced = re.subn(
        r'(<span class="result-count" id="doc-count" role="status" aria-live="polite">)\d+',
        lambda m: m.group(1) + str(count),
        html, count=1,
    )
    if replaced != 1:
        raise ValueError("Document search counter missing; refusing to publish")
    html = re.sub(
        r'\d+ organized categories · (?:Original PDF links retained|Original file links retained)',
        str(group_count) + ' organized categories · Original file links retained',
        html, count=1,
    )
    return html, count


def sync(source: list[PublicFile]) -> tuple[int, int, bool]:
    """Reconcile the public directory, unpublishing absent links promptly.

    Source is strictly the *anonymous* page. A missing link disappears on
    its first healthy absence; its metadata is retained for one more check
    so transient absences can be recognized. Sudden large drops fail closed.
    """
    state = _read_state()
    previous: dict[str, str] = dict(state["known"])
    source_by_url = {file.url: file for file in source}
    source_urls = set(source_by_url)
    if len(source_by_url) != len(source):
        raise ValueError("Ambiguous duplicate public document URLs")
    if any(approved_url(file.url) != file.url for file in source):
        raise ValueError("Public directory includes an unapproved URL")
    if len(source_by_url) < 35:
        raise ValueError("Public source is incomplete; no changes published")

    # Guard against partial pages. A troop leader can review a deliberately
    # large bulk removal instead of the website silently removing many links.
    prior_urls = set(previous)
    missing_from_source = prior_urls - source_urls
    allowed_missing = max(5, (len(prior_urls) + 9) // 10)
    if len(missing_from_source) > allowed_missing:
        raise ValueError(
            f"Source lost {len(missing_from_source)} of {len(prior_urls)} tracked files; "
            "manual review required before mass removal"
        )

    original_html = FORM_FILE.read_text(encoding="utf-8")
    original_links = _document_links(original_html)
    legacy_html = re.sub(
        r"\s*" + re.escape(START) + r"[\s\S]*?" + re.escape(END) + r"\s*",
        "", original_html,
    )
    if '</details></section><section class="banner-cta"' not in legacy_html:
        raise ValueError("Forms page layout changed; refusing to publish")

    previous_missing: dict[str, int] = dict(state["missing"])
    missing: dict[str, int] = {}
    relevant_urls = {u for u in original_links if u.startswith(BLOB_PREFIX)} | prior_urls
    for url in sorted(relevant_urls - source_urls):
        missing[url] = min(2, previous_missing.get(url, 0) + 1)
    keep_pending = {u for u, n in missing.items() if n < 2}
    active = source_by_url  # Do not expose URLs absent from the public listing.

    # Unpublish missing TWH items immediately; retain metadata separately for
    # a second check. Replace renamed labels; leave other hosts untouched.
    legacy_html = re.sub(
        r'<li class="doc-item">[\s\S]*?</li>',
        lambda m: _update_legacy(m, active, missing, previous),
        legacy_html,
    )
    base_links = _document_links(legacy_html)
    added = [file for url, file in active.items() if url not in base_links]
    added.sort(key=lambda file: (file.title.casefold(), file.url))
    if len(added) > 100:
        raise ValueError("Over 100 ungrouped public uploads; manual review required")

    block = ""
    if added:
        block = (
            "\n" + START + '\n<details data-reveal class="doc-group"><summary><span>'
            + 'Additional public files <small>' + str(len(added))
            + ' documents</small></span></summary><ul class="doc-items">'
            + "".join(_render_upload(file) for file in added)
            + "</ul></details>\n" + END + "\n"
        )
    html = legacy_html.replace(
        '</details></section><section class="banner-cta"',
        '</details>' + block + '</section><section class="banner-cta"',
        1,
    )
    html, total = _update_counts(html)

    # Every document search entry is reconciled to links actually rendered.
    # Preserve the hand-authored keywords/categories for surviving entries.
    index = json.loads(SEARCH_FILE.read_text(encoding="utf-8"))
    old_docs = {unescape(x.get("url", "")): x for x in index["items"] if x.get("kind") == "document"}
    rendered = _document_links(html)
    docs = []
    for url, title in rendered.items():
        original = old_docs.get(url, {})
        entry = dict(original) if original else {
            "kind": "document", "subtitle": "Forms & Documents · Additional public files",
            "keywords": "troop 710 public documents forms downloads",
            "source": "troopwebhost-sync",
        }
        entry["title"] = title
        entry["url"] = url
        docs.append(entry)
    old_items = index["items"]
    index["items"] = [item for item in old_items if item.get("kind") != "document"] + docs
    if index["items"] != old_items:
        index["updated"] = date.today().isoformat()
    serialized = json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n"

    # Only active/pending URLs survive into tracking state.
    next_state = {
        "version": 1,
        "known": {u: source_by_url[u].title if u in source_by_url else previous.get(u, original_links.get(u, ""))
                  for u in sorted(source_urls | keep_pending)},
        "missing": {u: n for u, n in sorted(missing.items()) if n < 2},
    }
    state_text = json.dumps(next_state, ensure_ascii=False, indent=2) + "\n"
    removed = sum(
        1 for u in original_links
        if u.startswith(BLOB_PREFIX) and u not in rendered
    )
    changed_html = write_if_changed(FORM_FILE, html)
    changed_index = write_if_changed(SEARCH_FILE, serialized)
    changed_state = (not STATE_FILE.exists()) or (STATE_FILE.read_text(encoding="utf-8") != state_text)
    if changed_state:
        STATE_FILE.write_text(state_text, encoding="utf-8")
    print(
        f"Public documents: {len(source_urls)} authoritative, "
        f"{len(added)} in latest uploads, {removed} removed from public site, "
        f"{len(keep_pending)} pending source confirmation, {total} on website."
    )
    return len(added), removed, changed_html or changed_index or changed_state


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
    added, removed, changed = sync(documents)
    print(str(len(documents)) + " public troop-hosted files found; " + str(added)
          + " ungrouped files, " + str(removed) + " removed; website "
          + ("updated" if changed else "unchanged") + ".")


if __name__ == "__main__":
    main()
