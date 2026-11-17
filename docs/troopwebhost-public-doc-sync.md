# TroopWebHost public document synchronization

## Intended upload workflow

1. An authorized adult uses TroopWebHost > Resources > Maintain Forms & Documents.
2. They upload the file, set **Access = Public**, enter a useful title and save.
3. The GitHub Actions job checks the **anonymous, public** Forms & Documents page every six hours.
4. It adds previously unindexed troop-hosted documents to the Troop 710 website's Documents page and global search index.
5. Files stay in TroopWebHost's Azure storage; our GitHub Pages site stores links/titles, not file copies.

The source portal is https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm.
The directly linked file host is
https://troopwebhost.blob.core.windows.net/troop710haciendaheights/.

## Important limits and safety

- This is a **draft integration** until the first live crawl has been verified. The vendor's public site sometimes needs an ASP.NET redirect/POST session, and there is no publicly documented automatic documents API confirmed for this troop.
- The browser context has **no login credentials**. Only URLs from Troop 710's own Azure blob container are accepted. External links, other troops' files, non-HTTPS links, and executables are excluded.
- A valid public crawl must return at least 35 approved troop-hosted files. If not, the job fails and **does not commit changes**. This protects against accidentally publishing an empty library when TroopWebHost changes its layout.
- This initial version **adds new uploads** alongside the curated 48-file snapshot. It does not delete the curated snapshot or automatically reconcile replacements/deletions. That requires validating an authoritative source feed and agreeing on how to handle old links.
- Any documents designated Troop or Leaders must stay in TroopWebHost. Do not link personal Scout records, completed medical forms, private contact details, or confidential files from the public site.
- TroopWebHost warns that knowing a stored document's URL may allow access regardless of its listed access setting. Do not rely on a public website or obscured URL for true confidentiality.
- This automation intentionally does **not** upload from the new public site to TroopWebHost: that would require a documented upload API and an authenticated, permissioned administrative flow.

## Review before merging

1. Open the draft PR and confirm the unit administrator approves public document mirroring.
2. Run the unit tests for parsers, HTML escaping, and idempotence.
3. Use a GitHub Actions manual dispatch or a temporary authorized test run to check the anonymous source page. If the scrape fails, inspect the public navigation/HTML and adjust the selector; do not add login credentials.
4. Verify a harmless test PDF uploaded in TroopWebHost with **Public** access appears on the website after the sync. Revert the test document if appropriate.
5. Check the website on mobile and desktop. Confirm document search, category chips, bookmarks, copy-link buttons, and global search all still work.
6. Merge only after verification. The scheduled job will then run every six hours; actual GitHub Actions cron timing is approximate.

The script can be run locally using a previously saved public page without accessing TroopWebHost:

    python scripts/sync_twh_public.py --html-file path/to/public-forms.html

For offline fixture tests, the minimum public-document threshold can be overridden with
--min-documents. Do not lower the threshold in production to make a failed scrape appear successful.

## Support option

Ask TroopWebHost support whether it offers a supported, anonymous read-only feed for public Forms & Documents (JSON, CSV, RSS, or API), and whether public page crawling is permitted. A documented feed is preferred over a browser-based integration.
