(async function () {
  // Prevent double-injection
  if (window.__linkedinMultiplexRunning) {
    console.log('[LinkMultiplex] Already running — skipping.');
    return;
  }
  window.__linkedinMultiplexRunning = true;

  const LOG = (msg) => console.log('[LinkMultiplex]', msg);
  LOG('Injected on: ' + window.location.href);

  // ─── Wait for a selector to appear (LinkedIn is a SPA — DOM renders after JS) ──
  function waitForSelector(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const combined = Array.isArray(selectors) ? selectors.join(',') : selectors;
      const found = document.querySelector(combined);
      if (found) { resolve(true); return; }

      const start = Date.now();
      const interval = setInterval(() => {
        if (document.querySelector(combined)) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          LOG('Timeout waiting for selector: ' + combined);
          resolve(false); // timed out but continue anyway
        }
      }, 400);
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function qs(root, selectors) {
    for (const sel of selectors) {
      try { const e = root.querySelector(sel); if (e) return e; } catch (_) {}
    }
    return null;
  }

  function text(root, selectors) {
    const e = qs(root, selectors);
    return e ? e.innerText.trim().replace(/\s+/g, ' ') : '';
  }

  function href(root, selectors) {
    const e = qs(root, selectors);
    if (!e) return '';
    const h = e.getAttribute('href') || '';
    try { return new URL(h, 'https://www.linkedin.com').href.split('?')[0]; } catch (_) { return h; }
  }

  // ─── Scroll to trigger lazy images / virtualized lists ────────────────────
  async function scrollPage() {
    const total = Math.max(document.body.scrollHeight, 2000);
    for (let i = 1; i <= 8; i++) {
      window.scrollTo(0, (total / 8) * i);
      await new Promise(r => setTimeout(r, 350));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  }

  // ─── Detect page type ─────────────────────────────────────────────────────
  function detectType() {
    const url = window.location.href;
    if (url.includes('/search/results/people/')) return 'people';
    if (url.includes('/search/results/content/')) return 'posts';
    if (url.includes('/search/results/jobs/') || url.includes('/jobs/search/')) return 'jobs';
    if (document.querySelector('.jobs-search-results__list')) return 'jobs';
    return 'posts'; // default for content search
  }

  // ─── Scraper: Posts ───────────────────────────────────────────────────────
  function scrapePosts() {
    const results = [];

    // LinkedIn search results for posts use .reusable-search__result-container
    // Each card contains the author + post snippet
    const containers = [
      ...document.querySelectorAll('.reusable-search__result-container'),
      ...document.querySelectorAll('[data-chameleon-result-urn]')
    ];

    // Deduplicate by element reference
    const unique = [...new Set(containers)];
    LOG('Post containers: ' + unique.length);

    unique.forEach(container => {
      try {
        // ── Author name
        const authorEl = qs(container, [
          '.update-components-actor__name span[aria-hidden="true"]',
          '.update-components-actor__title span[aria-hidden="true"]',
          '.update-components-actor__title .t-bold span',
          '.update-components-actor__name .t-bold',
          '.entity-result__title-text a span[aria-hidden="true"]',
          '.entity-result__title-text a'
        ]);
        const author = authorEl ? authorEl.innerText.trim().split('\n')[0].trim() : '';

        // ── Author profile URL
        const authorUrl = href(container, [
          '.update-components-actor__container a',
          '.update-components-actor__meta a',
          '.entity-result__title-text a'
        ]);

        // ── Poster headline
        const headline = text(container, [
          '.update-components-actor__description span[aria-hidden="true"]',
          '.update-components-actor__description .t-12',
          '.update-components-actor__description',
          '.entity-result__primary-subtitle'
        ]);

        // ── Post body text — the most important field
        const bodyEl = qs(container, [
          '.update-components-text .break-words',
          '.update-components-text span[dir="ltr"]',
          '.update-components-text .truncate',
          '.update-components-text',
          '.feed-shared-text .break-words',
          '.search-result__occlusion-hint span',
          '.entity-result__summary',
          '.entity-result__content-summary'
        ]);
        const postText = bodyEl ? bodyEl.innerText.trim().replace(/\s+/g, ' ') : '';

        // ── Post URL
        const postUrl = href(container, [
          'a[href*="/feed/update/"]',
          'a[href*="urn:li:activity"]',
          '.update-components-actor__sub-description a',
          '.update-components-actor__meta a[href*="/posts/"]',
          '.app-aware-link[href*="/posts/"]'
        ]);

        if (!author && !postText) return; // skip empty/ad cards

        results.push({
          type: 'posts',
          author: author || 'LinkedIn Member',
          authorUrl,
          headline,
          postText,
          postUrl: postUrl || window.location.href,
          snippet: postText.length > 220 ? postText.slice(0, 220) + '…' : postText
        });
      } catch (e) {
        LOG('Post parse error: ' + e.message);
      }
    });

    return results;
  }

  // ─── Scraper: People ──────────────────────────────────────────────────────
  function scrapePeople() {
    const results = [];
    const containers = document.querySelectorAll([
      '.reusable-search__result-container',
      '.entity-result'
    ].join(','));

    LOG('People containers: ' + containers.length);

    containers.forEach(container => {
      try {
        const nameEl = qs(container, [
          '.entity-result__title-text a span[aria-hidden="true"]',
          '.entity-result__title-text a',
        ]);
        const name = nameEl ? nameEl.innerText.trim().split('\n')[0] : '';
        if (!name || name.toLowerCase() === 'linkedin member') return;

        results.push({
          type: 'people',
          name,
          profileUrl: href(container, ['.entity-result__title-text a']),
          headline: text(container, ['.entity-result__primary-subtitle']),
          location: text(container, ['.entity-result__secondary-subtitle']),
          connection: text(container, ['.entity-result__badge-text', '.dist-value'])
        });
      } catch (e) {
        LOG('People parse error: ' + e.message);
      }
    });
    return results;
  }

  // ─── Scraper: Jobs ────────────────────────────────────────────────────────
  function scrapeJobs() {
    const results = [];
    const containers = document.querySelectorAll([
      '.jobs-search-results__list-item',
      '.job-card-container',
      '.reusable-search__result-container'
    ].join(','));

    LOG('Job containers: ' + containers.length);

    containers.forEach(container => {
      try {
        const titleEl = qs(container, ['a.job-card-list__title', '.entity-result__title-text a']);
        const title = titleEl ? titleEl.innerText.trim() : '';
        if (!title) return;
        results.push({
          type: 'jobs',
          title,
          jobUrl: href(container, ['a.job-card-list__title', '.entity-result__title-text a']),
          company: text(container, ['.job-card-container__company-name', '.entity-result__primary-subtitle']),
          location: text(container, ['.job-card-container__metadata-item', '.entity-result__secondary-subtitle'])
        });
      } catch (e) {
        LOG('Jobs parse error: ' + e.message);
      }
    });
    return results;
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  try {
    const pageType = detectType();
    LOG('Page type: ' + pageType + ' | URL: ' + window.location.href);

    // Wait for LinkedIn's SPA to render results into the DOM
    // These are the result container selectors we depend on
    const resultSelectors = [
      '.reusable-search__result-container',
      '.entity-result',
      '[data-chameleon-result-urn]',
      '.jobs-search-results__list-item'
    ];

    LOG('Waiting for results to render in DOM…');
    const appeared = await waitForSelector(resultSelectors, 10000);
    LOG('Results appeared: ' + appeared);

    // Scroll to trigger lazy-loaded items
    await scrollPage();

    // Final settle
    await new Promise(r => setTimeout(r, 500));

    let data = [];
    if (pageType === 'posts') data = scrapePosts();
    else if (pageType === 'people') data = scrapePeople();
    else if (pageType === 'jobs') data = scrapeJobs();

    LOG(`Scraped ${data.length} items (${pageType})`);

    chrome.runtime.sendMessage({
      type: 'SCRAPE_COMPLETED',
      success: true,
      pageType,
      data,
      url: window.location.href
    });

  } catch (err) {
    LOG('Fatal error: ' + err.message);
    chrome.runtime.sendMessage({
      type: 'SCRAPE_COMPLETED',
      success: false,
      error: err.message,
      data: [],
      url: window.location.href
    });
  } finally {
    window.__linkedinMultiplexRunning = false;
  }
})();
