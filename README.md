# Troop 710 — Hacienda Heights Website

A modern, mobile-friendly public information website for **Troop 710 of Hacienda Heights, California**.

**Official troop management portal:** https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm  
**Live GitHub Pages website:** https://willn0tbill.github.io/Troop710/

## Website structure

| File | Page | Purpose |
| --- | --- | --- |
| `index.html` | Home | Intro, programs, join information, and navigation |
| `about.html` | About Our Troop | A substantive welcome and overview of Scouts BSA values, plus verified troop resources |
| `leaders.html` | Adult Leaders | Public roster of 19 adults listed as Committee Members on TroopWebHost |
| `forms.html` | Forms & Documents | Searchable collection of 48 public PDF links in 9 categories |
| `resources.html` | Resource Links | Curated official troop and Scouting America links |
| `site-pages.css` | Shared page styles | Consistent typography, colors, layout, and mobile design for subpages |
| `site-pages.js` | Shared interactions | Mobile navigation, document search, and saved appearance settings |
| `motion.css` | Motion layer | Entrance and scroll animations |
| `themes.css` | Appearance | Light and dark palettes; preferences panel |
| `enhancements.css` | UI polish | Quick links, onboarding, filters, responsive footer |
| `enhancements.js` | Utility interactions | Leader search, document filters, expand/collapse, back to top |

No build tools, package installs, database, API keys, or third-party JavaScript frameworks are required.

## Where the information came from

The source is the **public** TroopWebHost website for Troop 710: https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm

The TroopWebHost front page uses an HTML redirect/POST to enter the troop application. The public tab paths discovered there were:

- Adult Leaders: `FormList.aspx?Menu_Item_ID=45869&Stack=1`
- About Our Troop: `formCustom.aspx?Menu_Item_ID=57959&Stack=0&Custom_Form_ID=2`
- Forms & Documents: `bsaShowTroopForms.aspx?Menu_Item_ID=45870&Stack=1`
- Resource Links: `FormList.aspx?Menu_Item_ID=45871&Stack=1`

These pages may rely on a browser session and are therefore accessed most reliably through the troop's official landing URL above.

### Adult Leaders

The public roster currently returns **19 names**, all marked `Committee Member`. The new site reproduces their public names and roles without contact information or photos. Confirm the list regularly; troop membership and positions can change.

### About Our Troop

The original public About Our Troop tab shows the platform's stock instructions to customize that page. The new site provides original, meaningful content instead of duplicating that placeholder. It does not invent historical founding dates, meeting times, roster details, fundraising records, or a chartering organization.

### Forms & Documents

The public directory contained 50 entries when checked in November 2026. The new website currently links to 48 appropriate public entries, grouped into nine clear categories, covering troop bylaws, membership, advancement, leadership paperwork, Eagle service project workbooks, volunteer paperwork, merit badges, and a district archive.

**The website links to original public files; it does not rehost them or bypass member-only access.** Original file titles and URLs are retained, and some older forms may be outdated. Verify important requirements against current troop and Scouting America guidance.

### Resource Links

The actual public Resource Links tab is empty at present. The new page transparently labels its list as *curated* and provides official troop and Scouting America links. It does not claim these links came from the empty source list.

### Privacy and accuracy

- Do not publish confidential member records, youth rosters, addresses, or medical forms completed by an individual.
- Any future troop photos or identifiable Scout images should be approved for public display.
- Adult leadership, public forms, event schedules, and fee details can become outdated.
- An authorized adult troop leader should review the public website and official program branding before describing it as the troop's approved official website.
- The website in GitHub is **separate from** TroopWebHost. Updating this repository does not edit TroopWebHost's About Our Troop page.

## Publish on GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose **main**, folder **/(root)**, then **Save**.
4. Once deployment finishes, visit https://willn0tbill.github.io/Troop710/

A code commit alone does not guarantee GitHub Pages is live.

## Maintenance

Edit `index.html` to change the home page, the four subpage HTML files to update the public sections, and `site-pages.css` for shared subpage appearance. The document links are embedded in `forms.html` and search is implemented in `site-pages.js`.

All externally hosted photos on the home page are illustrative stock landscapes, not photos of Troop 710 events.

## Design refresh — November 2026

The public website now uses a consistent, responsive design across all pages:

- Redesigned home page featuring a Scouting-focused hero, clear program overview, quick navigation to public troop information, and a simple joining pathway.
- Shared forest-green, ivory and sage design system with refined typography, consistent cards and buttons, improved spacing, and a matching SVG favicon.
- Consistent sticky navigation on all pages with accessible mobile toggle, Escape-key handling, and keyboard-visible focus states.
- Improved public document search behavior and screen-reader status updates; all 48 linked PDFs and nine organized categories remain available.
- Branded `404.html` page for unavailable routes.
- Explicit separation between verified troop facts, curated external links, and illustrative photography.

The site's source remains plain HTML, CSS and JavaScript without a build process. The HTML is valid for GitHub Pages branch deployment. Do not treat the repo as authorized to change TroopWebHost's own content.

## Usability upgrade — November 2026

- Home page now includes direct links for new families, current members, and volunteers, plus a three-step "start here" guide.
- About page resource cards link to searchable document categories instead of being decorative.
- Adult Leaders page has a client-side search across the 19 publicly listed committee members; no names are sent to a server.
- Forms & Documents offers quick category chips, keyword search, live result counts, and expand/collapse-all controls. URLs like `forms.html?category=eagle` and `forms.html?category=leadership` open relevant categories directly.
- Redesigned responsive footer provides obvious direct access to official troop information and public resources.
- Back-to-top shortcut appears on longer pages; it respects the user's no-animation setting.
- The existing Appearance menu retains Light/Dark and Animations On/No animations choices across pages.
- The upgrade preserves the original public PDF URLs rather than copying their documents.

### Check and maintain

The public site is hosted using GitHub Pages, so code changes can take time to propagate. Verify actual live pages, preferably on mobile and desktop, after each update. The documents and public leadership roster are a *snapshot*, not a live synchronized feed. Review these against the official TroopWebHost site before publishing new facts or claiming them as current.
