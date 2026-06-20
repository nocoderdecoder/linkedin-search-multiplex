# LinkedIn Search Multiplex 🔍

A premium Chrome Extension that helps recruiters run multiple LinkedIn search queries simultaneously and aggregate the results into a beautiful side-panel dashboard.

## ✨ Features

- **Multi-Query Automation** — Queue up multiple search queries (e.g. *"Hiring Product Marketing"*, *"PMM role"*, *"Join my team"*) and run them all sequentially with one click.
- **Smart Scraper** — Extracts People profiles, Feed Posts, or Job listings from LinkedIn search results.
- **Recruiter Dashboard** — Beautiful glassmorphism-styled side panel with tabs for Search, Results, and Settings.
- **Status Tracking** — Tag candidates/posts as **New**, **Contacted**, or **Skipped** to manage your outreach funnel.
- **CSV Export** — Download all scraped leads as a spreadsheet at any time.
- **Safety Delays** — Configurable delays and simulated scroll movements to mimic natural human behavior.

## 🚀 How to Install (Developer Mode)

1. Download or clone this repository.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top-right corner).
4. Click **Load Unpacked** and select this folder.
5. Pin the extension to your toolbar by clicking the 🧩 icon and pinning **LinkedIn Search Multiplex**.

## 📖 How to Use

1. Click the extension icon to open the Side Panel.
2. Make sure you are **logged into LinkedIn** in your browser.
3. In the **Search** tab, select the queries you want to run.
4. Choose a search category: *Posts*, *People*, or *Jobs*.
5. Click **Run Selected Queries** — a background tab will automatically navigate, scroll, and harvest results.
6. In the **Results** tab, review scraped items, update candidate statuses, and click **Export CSV**.

## 🛠 Tech Stack

- Manifest V3 Chrome Extension
- Vanilla HTML / CSS / JavaScript
- Chrome Storage API (all data stays local — no server)

## ⚠️ Important Notes

- You **must be logged into LinkedIn** for the scraper to function.
- Keep scraping depth to **1–2 pages per query** to stay within LinkedIn's rate limits.
- All scraped data is stored **locally on your device only** — nothing is transmitted externally.

## 📁 Project Structure

```
/
├── manifest.json         # Chrome Extension Manifest V3
├── background.js         # Service Worker (opens side panel, sets defaults)
├── content/
│   └── content.js        # Content Script (LinkedIn page scraper)
├── sidepanel/
│   ├── sidepanel.html    # Side Panel UI
│   ├── sidepanel.css     # Styling (Glassmorphism dark theme)
│   └── sidepanel.js      # Side Panel Logic & Automation Pipeline
└── CHROMEWEBSTORE.md     # Chrome Web Store publishing readiness doc
```

## 📜 License

MIT
