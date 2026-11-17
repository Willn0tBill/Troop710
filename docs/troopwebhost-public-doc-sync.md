# TroopWebHost public document synchronization

TroopWebHost is the file storage and document-access system. The Troop 710
GitHub Pages website stores **public document links and titles only**.
It must not gain member logins, private document URLs, or a second file store.

## Upload once

1. An authorized adult signs into the existing TroopWebHost site.
2. Go to **Resources → Maintain Forms & Documents → Add a New Item**.
3. Upload the file, set **Access = Public**, choose the title/category and save.
4. The GitHub Actions workflow reads the anonymous public directory
   about every six hours (GitHub scheduled runs may be delayed).
5. The document appears on the Troop 710 Documents page and site search;
   downloads continue directly from TroopWebHost's Azure file storage.

All other access levels stay managed by TroopWebHost, not by GitHub Pages.
See vendor documentation: https://www.troopwebhost.org/help.aspx?ID=97 .

## How additions, changes and removals work

- **New public upload:** the new title and link appears on the first healthy sync.
- **Title change:** the original category title is updated when the public
  listing changes after the first tracked snapshot.
- **File contents replaced at the same URL:** the website continues to use
  the same URL and therefore serves the updated file automatically.
- **A file replaced with a new URL:** the new link appears on the first sync.
  The old link is removed after two consecutive healthy public snapshots
  confirm it is absent from TroopWebHost.
- **Public file deleted or made private:** the public link is removed after
  two consecutive healthy public snapshots. (Removing its index entry does
  **not** revoke access to an old Azure URL.)
- **Externally hosted official forms:** curated third-party links remain
  untouched by this sync.

Confirmed removed links are deleted from both the website page and the
search index. The original curated document categories are preserved where
possible. New links that were not in the curated categories appear in
"Latest public uploads" and may later be organized manually.

## Failure and privacy safeguards

- Read the forms page **without logging in**. TroopWebHost's public HTML
  and direct public Azure URLs are the only discovery inputs.
- Only accept HTTPS documents hosted in the Troop 710 public blob container.
  Reject files for other troops, executable formats and selected titles that
  identify personally sensitive documents. This is additional defense in
  depth, not a substitute for correct document access permissions.
- Require at least 35 public troop-hosted files; reject an abrupt drop of
  more than 5 or about 10% from the previous tracked snapshot.
- Require **two consecutive successful public checks** for removals. Keep
  pending items visible until the second check. Failed reads never count.
- Track the current public inventory in
  \`troopwebhost-public-state.json\` to make synchronization deterministic.
- Never change or delete the original TroopWebHost file itself.
- TroopWebHost explicitly states that even documents tagged Troop or Leaders
  may be readable to anyone who knows their direct file URL. **Never upload
  truly confidential documents to TroopWebHost.**

The synchronizer is a public-page integration, not a supported vendor
webhook/API. If TroopWebHost changes its public page structure, it will
stop safely, and may need maintenance. Ask vendor support for a documented
read-only public directory feed if long-term reliability is essential.

## Operations and tests

Workflow: \`.github/workflows/sync-public-documents.yml\`

Script: \`scripts/sync_twh_public.py\`

Tests: \`tests/test_sync_twh_public.py\`

- GitHub Actions pull requests run unit tests and a read-only live anonymous
  source verification. They never publish files from a pull request.
- On \`main\`, runs occur on a six-hour schedule, by manual dispatch, or
  after sync implementation updates.
- When tracked HTML, search index or inventory state changes, a bot commit
  publishes changes and GitHub Pages deploys the static site.
- To test offline using an anonymous public HTML capture:

      python scripts/sync_twh_public.py --html-file public-forms.html

A real upload/change/delete verification should be performed by an authorized
TroopWebHost administrator using a harmless test PDF. Do not use a Scout's
medical or identifying documents as test files.
