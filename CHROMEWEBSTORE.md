# Chrome Web Store Listing — LinkedIn Search Multiplex

> Last Updated: 2026-06-20

## Store Listing

**Extension Name** [REQUIRED]
LinkedIn Search Multiplex


**Short Description** [REQUIRED]
Run and aggregate multiple LinkedIn queries sequentially in a side-panel recruiter dashboard.


**Detailed Description** [REQUIRED]
LinkedIn Search Multiplex is a productivity extension designed for recruiters, sourcers, and hiring managers to streamline candidate and post discovery on LinkedIn.

Key features:
- Queue multiple search queries (e.g., specific roles, hiring posts, headline queries) to run sequentially.
- Automatically scrape and aggregate candidates, posts, or job listings into a single side-panel dashboard.
- Update candidate recruiting status (New, Contacted, Skipped) directly within the extension.
- Clean profile, post, and job links by stripping tracking and analytics parameters automatically.
- Export your aggregated lead database to CSV at any time for spreadsheet integration.
- Configurable delays and simulated scroll movements to mimic natural human reading patterns.

How to use it:
1. Open the LinkedIn Search Multiplex side panel by clicking the extension icon.
2. In the Search tab, choose what you want to search for (People, Posts, or Jobs).
3. Select the queries you want to run, or add your own custom queries.
4. Click "Run Selected Queries". The extension will open a background LinkedIn tab, run the queries sequentially with safety delays, and extract matching records.
5. In the Results tab, view your aggregated leads list, update recruiter statuses, and click "Export CSV" to download your leads database.

Privacy & Permissions:
All data scraped by this extension is stored locally in your browser using Chrome Storage API. No data is transmitted off-device or shared with any third parties.


**Category** [REQUIRED]
Productivity


**Single Purpose** [REQUIRED]
Sequentially runs multiple LinkedIn search queries and aggregates results in a side panel leads dashboard.


**Primary Language** [REQUIRED]
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1:** Search Tab view showing selected queries list, the category selector, and active progress bar.
- **Screenshot 2:** Results Tab view showcasing scraped candidate card elements, status labels, search filters, and the "Export CSV" button.


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `sidePanel` | permissions | Required to display the main recruiter dashboard side-by-side with LinkedIn. |
| `storage` | permissions | Required to store the user's custom queries, scrape settings, and aggregated candidates list. |
| `tabs` | permissions | Required to open the background search worker tab and monitor load state status before scraping. |
| `scripting` | permissions | Required to execute the content scraping script on active search tabs. |
| `https://*.linkedin.com/*` | host_permissions | Required to scrape search results (people, posts, jobs) directly from LinkedIn search result pages. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

*Data is strictly kept on the user's local device inside the browser sandbox using Chrome's local storage API.*

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
*To be hosted upon publish (e.g. GitHub Pages or personal site)*


## Distribution

**Visibility**: Private (Recruiter test group)
**Regions**: All regions
**Pricing**: Free


## Developer Info

**Publisher Name** [REQUIRED]
Recruiter Tools Group

**Contact Email** [REQUIRED]
support@recruitermultiplex.local


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-20 | Initial release. Includes query management, multi-query scraper runner, results manager (status tags), and CSV exporter. | Draft |


## Review Notes

### Known Issues / Limitations
- Requires the user to be active and logged into LinkedIn. If logged out, the scrape pipeline returns 0 results and recommends logging in.
- Rate limiting may occur if running more than 20 queries concurrently with short safety delays.
