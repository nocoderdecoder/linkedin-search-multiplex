(async function () {
  console.log("[LinkedIn Multiplex Scraper] Script injected and active.");

  // Helper to query element with fallbacks
  function querySelectorFallback(element, selectors) {
    for (const selector of selectors) {
      const el = element.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  // Helper to get text content with fallbacks
  function getTextFallback(element, selectors) {
    const el = querySelectorFallback(element, selectors);
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  // Helper to get attribute with fallbacks
  function getAttributeFallback(element, selectors, attribute) {
    const el = querySelectorFallback(element, selectors);
    if (!el) return '';
    const attr = el.getAttribute(attribute);
    return attr ? attr.trim() : '';
  }

  // Clean URLs by removing search queries & trackers
  function cleanUrl(url) {
    if (!url) return '';
    try {
      // Resolve relative URLs to absolute
      const absoluteUrl = new URL(url, window.location.origin).href;
      const parsed = new URL(absoluteUrl);
      return parsed.origin + parsed.pathname;
    } catch (e) {
      return url;
    }
  }

  // Define selectors for LinkedIn's DOM
  const SELECTORS = {
    // Top-level containers for search items
    peopleContainers: [
      '.reusable-search__result-container',
      '.entity-result[data-chameleon-result-urn*="urn:li:member:"]',
      '.entity-result'
    ],
    postContainers: [
      '.feed-shared-update-v2',
      '.reusable-search__result-container:has(a[href*="/feed/update/"])',
      '.reusable-search__result-container:has(a[href*="/posts/"])'
    ],
    jobContainers: [
      '.jobs-search-results-list__list-item',
      '.job-card-container',
      '.reusable-search__result-container:has(a[href*="/jobs/view/"])'
    ],
    
    // Field-level selectors
    people: {
      name: [
        '.entity-result__title-text a.app-aware-link',
        '.entity-result__title-text a',
        '.entity-result__title-line a',
        'span.name.actor-name',
        '.entity-result__title-text'
      ],
      headline: [
        '.entity-result__primary-subtitle',
        '.subline-level-1',
        '.entity-result__summary'
      ],
      location: [
        '.entity-result__secondary-subtitle',
        '.subline-level-2'
      ],
      connection: [
        '.entity-result__badge-text',
        '.entity-result__badge',
        '.entity-result__badge-text span'
      ]
    },
    posts: {
      author: [
        '.update-components-actor__title span[aria-hidden="true"]',
        '.update-components-actor__title',
        '.feed-shared-update-v2__actor-name',
        '.entity-result__title-text a',
        '.update-components-actor__name',
        '.update-components-actor__title span'
      ],
      authorLink: [
        '.update-components-actor__title a',
        '.update-components-actor__meta a',
        'a.app-aware-link'
      ],
      text: [
        '.update-components-text',
        '.feed-shared-update-v2__description',
        '.feed-shared-update-v2__commentary',
        '.feed-shared-text',
        '.feed-shared-update-v2__commentary span',
        '.update-components-text-view'
      ],
      link: [
        'a[href*="/feed/update/"]',
        'a[href*="/posts/"]',
        '.update-components-actor__sub-text a',
        '.feed-shared-update-v2__sub-text a'
      ]
    },
    jobs: {
      title: [
        '.entity-result__title-text a',
        '.job-card-list__title',
        '.job-card-container__link',
        '.disabled.jobs-search-results-list__list-item-title',
        'a.job-card-list__title'
      ],
      company: [
        '.entity-result__primary-subtitle',
        '.job-card-container__company-name',
        '.job-card-container__company-link',
        '.job-card-container__primary-description a'
      ],
      location: [
        '.entity-result__secondary-subtitle',
        '.job-card-container__metadata-item',
        '.job-card-container__metadata-item--one-line',
        '.job-card-container__metadata-wrapper li'
      ]
    }
  };

  // Perform smooth scrolling to trigger lazy load elements
  async function scrollPage(scrollSteps = 6, stepDelay = 300) {
    console.log("[LinkedIn Multiplex Scraper] Starting page scroll for lazy loading...");
    for (let i = 0; i < scrollSteps; i++) {
      window.scrollBy(0, window.innerHeight / 2);
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }
    // Scroll back to top to let everything settle
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Determine current search type from URL
  function detectSearchType() {
    const url = window.location.href;
    if (url.includes("/search/results/people/")) {
      return "people";
    } else if (url.includes("/search/results/content/") || url.includes("/search/results/index/") || url.includes("resultType=CONTENT")) {
      return "posts";
    } else if (url.includes("/search/results/jobs/") || url.includes("/jobs/search/")) {
      return "jobs";
    }
    
    // Fallback detection by scanning page content selectors
    if (document.querySelector('.jobs-search-results-list__list-item, .job-card-container')) {
      return "jobs";
    }
    if (document.querySelector('.feed-shared-update-v2')) {
      return "posts";
    }
    return "people"; // default fallback
  }

  // Scrape items based on detected type
  async function scrapePage() {
    const type = detectSearchType();
    console.log(`[LinkedIn Multiplex Scraper] Detected search type: ${type}`);
    
    const results = [];
    
    if (type === "people") {
      const containers = document.querySelectorAll(SELECTORS.peopleContainers.join(','));
      console.log(`[LinkedIn Multiplex Scraper] Found ${containers.length} people containers.`);
      
      containers.forEach(container => {
        const nameLink = querySelectorFallback(container, SELECTORS.people.name);
        const name = nameLink ? nameLink.textContent.trim().split('\n')[0].trim() : '';
        const profileUrl = nameLink ? cleanUrl(nameLink.getAttribute('href')) : '';
        
        // Skip results with empty names (placeholder/ads)
        if (!name || name.toLowerCase().includes("linkedin member")) return;
        
        const headline = getTextFallback(container, SELECTORS.people.headline);
        const location = getTextFallback(container, SELECTORS.people.location);
        const connection = getTextFallback(container, SELECTORS.people.connection);
        
        results.push({
          type: "people",
          name,
          profileUrl,
          headline,
          location,
          connection
        });
      });
      
    } else if (type === "posts") {
      const containers = document.querySelectorAll(SELECTORS.postContainers.join(','));
      console.log(`[LinkedIn Multiplex Scraper] Found ${containers.length} post containers.`);
      
      containers.forEach(container => {
        const author = getTextFallback(container, SELECTORS.posts.author);
        const authorLink = cleanUrl(getAttributeFallback(container, SELECTORS.posts.authorLink, 'href'));
        const text = getTextFallback(container, SELECTORS.posts.text);
        const postLink = cleanUrl(getAttributeFallback(container, SELECTORS.posts.link, 'href'));
        
        if (!author && !text) return; // skip empty elements
        
        results.push({
          type: "posts",
          author: author || "LinkedIn User",
          authorLink,
          text: text || "[No text content]",
          postLink: postLink || window.location.href,
          snippet: text ? (text.length > 150 ? text.substring(0, 150) + "..." : text) : "[No text content]"
        });
      });
      
    } else if (type === "jobs") {
      const containers = document.querySelectorAll(SELECTORS.jobContainers.join(','));
      console.log(`[LinkedIn Multiplex Scraper] Found ${containers.length} job containers.`);
      
      containers.forEach(container => {
        const titleLink = querySelectorFallback(container, SELECTORS.jobs.title);
        const title = titleLink ? titleLink.textContent.trim() : '';
        const jobLink = titleLink ? cleanUrl(titleLink.getAttribute('href')) : '';
        
        if (!title) return;
        
        const company = getTextFallback(container, SELECTORS.jobs.company);
        const location = getTextFallback(container, SELECTORS.jobs.location);
        
        results.push({
          type: "jobs",
          title,
          company,
          location,
          jobLink
        });
      });
    }

    return results;
  }

  // Run the sequence
  try {
    // 1. Run scroll to load lazy elements
    await scrollPage();
    
    // 2. Perform scraping
    const data = await scrapePage();
    console.log(`[LinkedIn Multiplex Scraper] Scraped ${data.length} items successfully.`);
    
    // 3. Send results back to the extension
    chrome.runtime.sendMessage({
      type: "SCRAPE_COMPLETED",
      success: true,
      data: data,
      url: window.location.href
    });
  } catch (error) {
    console.error("[LinkedIn Multiplex Scraper] Error during scraping execution:", error);
    chrome.runtime.sendMessage({
      type: "SCRAPE_COMPLETED",
      success: false,
      error: error.message,
      url: window.location.href
    });
  }
})();
