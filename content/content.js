(async function () {
  // Prevent double-injection
  if (window.__linkedinMultiplexRunning) {
    console.log('[LinkMultiplex] Already running, skipping re-injection.');
    return;
  }
  window.__linkedinMultiplexRunning = true;

  console.log('[LinkMultiplex] Content script injected on:', window.location.href);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function qs(root, selectors) {
    for (const sel of selectors) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function getText(root, selectors) {
    const el = qs(root, selectors);
    return el ? el.innerText.trim().replace(/\s+/g, ' ') : '';
  }

  function getHref(root, selectors) {
    const el = qs(root, selectors);
    if (!el) return '';
    const href = el.getAttribute('href') || '';
    if (!href) return '';
    try {
      return new URL(href, 'https://www.linkedin.com').href.split('?')[0];
    } catch (_) {
      return href;
    }
  }

  // ─── Scroll to trigger lazy-loading ──────────────────────────────────────
  async function scrollToLoad() {
    const total = document.body.scrollHeight;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, (total / steps) * i);
      await new Promise(r => setTimeout(r, 400));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 800));
  }

  // ─── Detect page type ─────────────────────────────────────────────────────
  function detectType() {
    const url = window.location.href;
    if (url.includes('/search/results/people/')) return 'people';
    if (url.includes('/search/results/content/')) return 'posts';
    if (url.includes('/search/results/jobs/') || url.includes('/jobs/search/')) return 'jobs';
    // fallback by DOM presence
    if (document.querySelector('.jobs-search-results__list')) return 'jobs';
    if (document.querySelector('.search-results-container')) return 'posts';
    return 'unknown';
  }

  // ─── Scraper: Posts ───────────────────────────────────────────────────────
  function scrapePosts() {
    const results = [];
    // LinkedIn search results for content (posts)
    const containers = document.querySelectorAll([
      '.reusable-search__result-container',
      '.search-result__wrapper',
      '[data-chameleon-result-urn]',
      '.entity-result'
    ].join(','));

    console.log('[LinkMultiplex] Post containers found:', containers.length);

    containers.forEach(container => {
      try {
        // Author name — multiple fallbacks for LinkedIn's changing DOM
        const authorEl = qs(container, [
          '.update-components-actor__name span[aria-hidden="true"]',
          '.update-components-actor__title span[aria-hidden="true"]',
          '.entity-result__title-text a',
          '.update-components-actor__name',
          '.app-aware-link .t-bold span[aria-hidden="true"]',
          '.entity-result__title-line a'
        ]);
        const author = authorEl ? authorEl.innerText.trim() : '';

        // Author profile URL
        const authorUrl = getHref(container, [
          '.update-components-actor__meta a',
          '.update-components-actor__name a',
          '.entity-result__title-text a',
          'a.app-aware-link'
        ]);

        // Post body text
        const bodyEl = qs(container, [
          '.update-components-text span[dir="ltr"]',
          '.update-components-text .break-words',
          '.update-components-text',
          '.feed-shared-text span',
          '.feed-shared-update-v2__description-wrapper',
          '.search-result__occlusion-hint',
          '.entity-result__summary'
        ]);
        const postText = bodyEl ? bodyEl.innerText.trim().replace(/\s+/g, ' ') : '';

        // Post link
        const postUrl = getHref(container, [
          'a[href*="/feed/update/"]',
          'a[href*="activity-"]',
          '.update-components-actor__meta a',
          '.app-aware-link[href*="/posts/"]'
        ]) || window.location.href;

        // Poster headline / subtitle
        const headline = getText(container, [
          '.update-components-actor__description span[aria-hidden="true"]',
          '.update-components-actor__description',
          '.entity-result__primary-subtitle'
        ]);

        // Skip completely empty containers
        if (!author && !postText) return;

        results.push({
          type: 'posts',
          author: author || 'LinkedIn Member',
          authorUrl,
          headline,
          postText,
          postUrl,
          snippet: postText.length > 200 ? postText.substring(0, 200) + '…' : postText
        });
      } catch (e) {
        console.warn('[LinkMultiplex] Error parsing post container:', e);
      }
    });

    return results;
  }

  // ─── Scraper: People ─────────────────────────────────────────────────────
  function scrapePeople() {
    const results = [];
    const containers = document.querySelectorAll([
      '.reusable-search__result-container',
      '.entity-result',
      '.search-result__wrapper'
    ].join(','));

    console.log('[LinkMultiplex] People containers found:', containers.length);

    containers.forEach(container => {
      try {
        const nameEl = qs(container, [
          '.entity-result__title-text a span[aria-hidden="true"]',
          '.entity-result__title-text a',
          '.entity-result__title-line a'
        ]);
        const name = nameEl ? nameEl.innerText.trim() : '';
        if (!name || name.toLowerCase() === 'linkedin member') return;

        const profileUrl = getHref(container, [
          '.entity-result__title-text a',
          '.entity-result__title-line a'
        ]);

        const headline = getText(container, [
          '.entity-result__primary-subtitle',
          '.entity-result__summary .entity-result__simple-insight-text'
        ]);

        const location = getText(container, [
          '.entity-result__secondary-subtitle',
          '.entity-result__simple-insight-text--tall'
        ]);

        const connection = getText(container, [
          '.entity-result__badge-text',
          '.dist-value'
        ]);

        results.push({ type: 'people', name, profileUrl, headline, location, connection });
      } catch (e) {
        console.warn('[LinkMultiplex] Error parsing people container:', e);
      }
    });

    return results;
  }

  // ─── Scraper: Jobs ───────────────────────────────────────────────────────
  function scrapeJobs() {
    const results = [];
    const containers = document.querySelectorAll([
      '.jobs-search-results__list-item',
      '.job-card-container',
      '.reusable-search__result-container'
    ].join(','));

    console.log('[LinkMultiplex] Job containers found:', containers.length);

    containers.forEach(container => {
      try {
        const titleEl = qs(container, [
          'a.job-card-list__title',
          '.job-card-container__link',
          '.entity-result__title-text a'
        ]);
        const title = titleEl ? titleEl.innerText.trim() : '';
        if (!title) return;

        const jobUrl = getHref(container, [
          'a.job-card-list__title',
          '.job-card-container__link',
          '.entity-result__title-text a'
        ]);

        const company = getText(container, [
          '.job-card-container__company-name',
          '.job-card-container__primary-description',
          '.entity-result__primary-subtitle'
        ]);

        const location = getText(container, [
          '.job-card-container__metadata-item',
          '.entity-result__secondary-subtitle'
        ]);

        results.push({ type: 'jobs', title, jobUrl, company, location });
      } catch (e) {
        console.warn('[LinkMultiplex] Error parsing job container:', e);
      }
    });

    return results;
  }

  // ─── Main execution ───────────────────────────────────────────────────────
  try {
    const pageType = detectType();
    console.log('[LinkMultiplex] Detected page type:', pageType, '| URL:', window.location.href);

    if (pageType === 'unknown') {
      chrome.runtime.sendMessage({
        type: 'SCRAPE_COMPLETED',
        success: false,
        error: 'Could not detect LinkedIn search page type. Make sure you are on a LinkedIn search results page.',
        data: [],
        url: window.location.href
      });
      return;
    }

    // Scroll to load lazy elements
    await scrollToLoad();

    // Wait an additional moment for DOM to fully settle
    await new Promise(r => setTimeout(r, 600));

    let data = [];
    if (pageType === 'posts') data = scrapePosts();
    else if (pageType === 'people') data = scrapePeople();
    else if (pageType === 'jobs') data = scrapeJobs();

    console.log(`[LinkMultiplex] Scraped ${data.length} items from ${pageType}`);

    chrome.runtime.sendMessage({
      type: 'SCRAPE_COMPLETED',
      success: true,
      pageType,
      data,
      url: window.location.href
    });

  } catch (err) {
    console.error('[LinkMultiplex] Fatal scrape error:', err);
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
