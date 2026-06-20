// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  queries: [],
  results: [],
  settings: { pagesLimit: 1, delaySeconds: 4, autoScroll: true },
  isSearching: false,
  workerTabId: null
};

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const el = {
  tabs: document.querySelectorAll('.nav-tab'),
  panels: document.querySelectorAll('.tab-panel'),
  resultsBadge: document.getElementById('results-count-badge'),

  addQueryForm: document.getElementById('add-query-form'),
  queryInput: document.getElementById('query-input'),
  queriesList: document.getElementById('queries-list'),
  selectAllQueries: document.getElementById('select-all-queries'),
  deselectAllQueries: document.getElementById('deselect-all-queries'),
  searchCategory: document.getElementById('search-category'),
  dateFilter: document.getElementById('date-filter'),
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),

  progressPanel: document.getElementById('progress-panel'),
  progressStatus: document.getElementById('progress-status-label'),
  progressRatio: document.getElementById('progress-ratio'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressSubDetail: document.getElementById('progress-sub-detail'),

  resultsSearch: document.getElementById('results-search'),
  filterQuery: document.getElementById('filter-query'),
  filterStatus: document.getElementById('filter-status'),
  filterPeriod: document.getElementById('filter-period'),
  filterCategory: document.getElementById('filter-category'),
  resultsFeed: document.getElementById('results-feed'),
  noResultsMsg: document.getElementById('no-results-msg'),
  exportCsvBtn: document.getElementById('export-csv-btn'),
  clearDataBtn: document.getElementById('clear-data-btn'),

  settingPagesLimit: document.getElementById('setting-pages-limit'),
  settingDelay: document.getElementById('setting-delay'),
  settingAutoscroll: document.getElementById('setting-autoscroll'),

  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadStateFromStorage();
  initNavigation();
  initQueryManagement();
  initSettingsListeners();
  initResultsListeners();
  initSearchRunner();
  renderQueries();
  renderResults();
  populateQueryFilter();
});

async function loadStateFromStorage() {
  const data = await chrome.storage.local.get(['queries', 'scrapedResults', 'scrapeSettings']);
  if (data.queries) state.queries = data.queries;
  if (data.scrapedResults) state.results = data.scrapedResults;
  if (data.scrapeSettings) {
    state.settings = data.scrapeSettings;
    el.settingPagesLimit.value = state.settings.pagesLimit;
    el.settingDelay.value = state.settings.delaySeconds;
    el.settingAutoscroll.checked = state.settings.autoScroll;
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function initNavigation() {
  el.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      el.tabs.forEach(t => t.classList.remove('active'));
      el.panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(message, duration = 3500) {
  clearTimeout(toastTimer);
  el.toastMessage.textContent = message;
  el.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), duration);
}

// ─── Query Management ─────────────────────────────────────────────────────────
function initQueryManagement() {
  el.addQueryForm.addEventListener('submit', async e => {
    e.preventDefault();
    const text = el.queryInput.value.trim();
    if (!text) return;
    if (state.queries.some(q => q.text.toLowerCase() === text.toLowerCase())) {
      showToast('Query already exists!');
      return;
    }
    state.queries.push({ id: 'q_' + Date.now(), text, enabled: true });
    await chrome.storage.local.set({ queries: state.queries });
    el.queryInput.value = '';
    renderQueries();
    populateQueryFilter();
    showToast('Query added ✓');
  });

  el.selectAllQueries.addEventListener('click', async () => {
    state.queries.forEach(q => q.enabled = true);
    await chrome.storage.local.set({ queries: state.queries });
    renderQueries();
  });

  el.deselectAllQueries.addEventListener('click', async () => {
    state.queries.forEach(q => q.enabled = false);
    await chrome.storage.local.set({ queries: state.queries });
    renderQueries();
  });
}

function renderQueries() {
  el.queriesList.innerHTML = '';
  if (state.queries.length === 0) {
    el.queriesList.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--text-muted);text-align:center">No queries yet — add one above.</div>';
    return;
  }
  state.queries.forEach(query => {
    const item = document.createElement('div');
    item.className = 'query-item';

    const label = document.createElement('label');
    label.className = 'query-checkbox-label';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = query.enabled;
    cb.addEventListener('change', async () => {
      query.enabled = cb.checked;
      await chrome.storage.local.set({ queries: state.queries });
    });

    const txt = document.createElement('span');
    txt.className = 'query-text';
    txt.textContent = query.text;

    label.appendChild(cb);
    label.appendChild(txt);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-query-btn';
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    delBtn.addEventListener('click', async e => {
      e.stopPropagation();
      state.queries = state.queries.filter(q => q.id !== query.id);
      await chrome.storage.local.set({ queries: state.queries });
      renderQueries();
      populateQueryFilter();
    });

    item.appendChild(label);
    item.appendChild(delBtn);
    el.queriesList.appendChild(item);
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function initSettingsListeners() {
  el.settingPagesLimit.addEventListener('change', async () => {
    state.settings.pagesLimit = parseInt(el.settingPagesLimit.value);
    await chrome.storage.local.set({ scrapeSettings: state.settings });
    showToast('Settings saved');
  });
  el.settingDelay.addEventListener('change', async () => {
    state.settings.delaySeconds = parseInt(el.settingDelay.value);
    await chrome.storage.local.set({ scrapeSettings: state.settings });
    showToast('Settings saved');
  });
  el.settingAutoscroll.addEventListener('change', async () => {
    state.settings.autoScroll = el.settingAutoscroll.checked;
    await chrome.storage.local.set({ scrapeSettings: state.settings });
    showToast('Settings saved');
  });
}

// ─── Results ──────────────────────────────────────────────────────────────────
function initResultsListeners() {
  el.resultsSearch.addEventListener('input', renderResults);
  el.filterQuery.addEventListener('change', renderResults);
  el.filterStatus.addEventListener('change', renderResults);
  el.filterPeriod.addEventListener('change', renderResults);
  el.filterCategory.addEventListener('change', renderResults);

  el.clearDataBtn.addEventListener('click', async () => {
    if (!confirm('Clear ALL scraped results? This cannot be undone.')) return;
    state.results = [];
    await chrome.storage.local.set({ scrapedResults: [] });
    renderResults();
    populateQueryFilter();
    showToast('All data cleared');
  });

  el.exportCsvBtn.addEventListener('click', exportToCSV);
}

function populateQueryFilter() {
  const cur = el.filterQuery.value;
  el.filterQuery.innerHTML = '<option value="all">All Queries</option>';
  const unique = [...new Set(state.results.map(r => r.query).filter(Boolean))];
  unique.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q;
    opt.textContent = q;
    el.filterQuery.appendChild(opt);
  });
  if (unique.includes(cur)) el.filterQuery.value = cur;
}

// Map datePosted param → approximate ms lookback for client-side filtering
const PERIOD_MS = {
  'past-24h': 2 * 24 * 60 * 60 * 1000,   // 48 h (labelled "last 48h" but param is 24h)
  'past-week': 7 * 24 * 60 * 60 * 1000,
  'past-month': 30 * 24 * 60 * 60 * 1000,
  'all': Infinity
};

function renderResults() {
  const term = el.resultsSearch.value.toLowerCase().trim();
  const selQuery = el.filterQuery.value;
  const selStatus = el.filterStatus.value;
  const selPeriod = el.filterPeriod.value;
  const selCat = el.filterCategory.value;
  const cutoff = selPeriod !== 'all' ? Date.now() - (PERIOD_MS[selPeriod] || Infinity) : 0;

  const filtered = state.results.filter(item => {
    if (selQuery !== 'all' && item.query !== selQuery) return false;
    if (selStatus !== 'all' && item.status !== selStatus) return false;
    if (selCat !== 'all' && item.category !== selCat) return false;
    if (cutoff && new Date(item.scrapedAt).getTime() < cutoff) return false;
    if (term) {
      const haystack = [item.name, item.author, item.headline, item.postText, item.title, item.company]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  // Badge count
  const newCount = state.results.filter(r => r.status === 'New').length;
  el.resultsBadge.textContent = newCount;
  el.resultsBadge.classList.toggle('hidden', newCount === 0);

  el.resultsFeed.innerHTML = '';

  if (filtered.length === 0) {
    el.noResultsMsg.classList.remove('hidden');
    return;
  }
  el.noResultsMsg.classList.add('hidden');

  filtered.forEach(item => el.resultsFeed.appendChild(buildCard(item)));
}

// ─── Card Builder ─────────────────────────────────────────────────────────────
function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'result-card';

  // ── Category pill
  const catColors = { posts: '#3b82f6', people: '#8b5cf6', jobs: '#f59e0b' };
  const catLabels = { posts: 'Post', people: 'Person', jobs: 'Job' };
  const catPill = `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:${catColors[item.category] || '#6b7280'}22;color:${catColors[item.category] || '#9ca3af'};border:1px solid ${catColors[item.category] || '#6b7280'}44;text-transform:uppercase;letter-spacing:.5px">${catLabels[item.category] || item.category}</span>`;

  // ── Header: title + status badge
  const statusClass = (item.status || 'New').toLowerCase();
  card.innerHTML = `
    <div class="result-card-header">
      <div class="result-title-block">
        ${buildTitle(item)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        ${catPill}
        <span class="badge-status ${statusClass}">${item.status || 'New'}</span>
      </div>
    </div>
    ${buildBody(item)}
    ${buildMeta(item)}
    ${buildActions(item)}
  `;

  // Expandable post text
  const textBlock = card.querySelector('.post-content-block');
  if (textBlock) {
    textBlock.addEventListener('click', () => textBlock.classList.toggle('collapsed'));
  }

  // Status dropdown handler
  const statusSel = card.querySelector('.card-status-select');
  if (statusSel) {
    statusSel.addEventListener('change', async () => {
      const dbItem = state.results.find(r => r.id === item.id);
      if (dbItem) {
        dbItem.status = statusSel.value;
        await chrome.storage.local.set({ scrapedResults: state.results });
        renderResults();
        showToast(`Status → ${statusSel.value}`);
      }
    });
  }

  return card;
}

function buildTitle(item) {
  if (item.category === 'posts') {
    const link = item.authorUrl
      ? `<a href="${item.authorUrl}" target="_blank">${item.author || 'LinkedIn Member'}</a>`
      : (item.author || 'LinkedIn Member');
    return `
      <div class="result-main-title">${link}</div>
      ${item.headline ? `<div class="result-sub-title">${item.headline}</div>` : ''}
    `;
  }
  if (item.category === 'people') {
    const link = item.profileUrl
      ? `<a href="${item.profileUrl}" target="_blank">${item.name}</a>`
      : item.name;
    return `
      <div class="result-main-title">${link}</div>
      ${item.headline ? `<div class="result-sub-title">${item.headline}</div>` : ''}
    `;
  }
  if (item.category === 'jobs') {
    const link = item.jobUrl
      ? `<a href="${item.jobUrl}" target="_blank">${item.title}</a>`
      : item.title;
    return `
      <div class="result-main-title">${link}</div>
      ${item.company ? `<div class="result-sub-title">at <strong>${item.company}</strong></div>` : ''}
    `;
  }
  return '';
}

function buildBody(item) {
  if (item.category === 'posts' && item.postText) {
    return `<div class="post-content-block collapsed">${escHtml(item.postText)}</div>`;
  }
  return '';
}

function buildMeta(item) {
  const parts = [];
  const icon = (d) => `<svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none">${d}</svg>`;
  const mapPin = icon('<path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/>');
  const clock = icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
  const link = icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>');

  if (item.location) parts.push(`<div class="result-meta-item">${mapPin}<span>${escHtml(item.location)}</span></div>`);
  if (item.connection) parts.push(`<div class="result-meta-item"><span class="badge-status skipped">${escHtml(item.connection)}</span></div>`);
  if (item.scrapedAt) {
    const d = new Date(item.scrapedAt);
    parts.push(`<div class="result-meta-item">${clock}<span>Scraped ${d.toLocaleDateString()}</span></div>`);
  }
  if (item.query) parts.push(`<div class="result-meta-item">${link}<span style="color:var(--primary)">"${escHtml(item.query)}"</span></div>`);

  return parts.length ? `<div class="result-meta-row">${parts.join('')}</div>` : '';
}

function buildActions(item) {
  const link = item.postUrl || item.profileUrl || item.jobUrl || item.authorUrl || '';
  const label = item.category === 'people' ? 'View Profile' : item.category === 'jobs' ? 'View Job' : 'View Post';
  const linkBtn = link
    ? `<a href="${link}" target="_blank" class="card-link-icon-btn">
        <span>${label}</span>
        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
      </a>`
    : '';

  const statuses = ['New', 'Contacted', 'Skipped'];
  const options = statuses.map(s => `<option value="${s}"${s === (item.status || 'New') ? ' selected' : ''}>${s}</option>`).join('');

  return `
    <div class="result-card-actions">
      <select class="card-status-select">${options}</select>
      ${linkBtn}
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Search Runner ────────────────────────────────────────────────────────────
function initSearchRunner() {
  el.startBtn.addEventListener('click', startSearchWorkflow);
  el.stopBtn.addEventListener('click', stopSearchWorkflow);
}

// Build LinkedIn search URL including time filter
function buildSearchUrl(queryText, category, datePosted, page) {
  const encoded = encodeURIComponent(queryText);
  const pageParam = page > 1 ? `&page=${page}` : '';
  const dateParam = datePosted ? `&datePosted=${datePosted}` : '';

  if (category === 'people') {
    return `https://www.linkedin.com/search/results/people/?keywords=${encoded}${pageParam}`;
  }
  if (category === 'jobs') {
    return `https://www.linkedin.com/jobs/search/?keywords=${encoded}${pageParam}`;
  }
  // posts / content
  return `https://www.linkedin.com/search/results/content/?keywords=${encoded}${dateParam}${pageParam}&sortBy=date_posted`;
}

async function navigateAndWait(tabId, targetUrl, timeout = 25000) {
  try {
    const oldTab = await chrome.tabs.get(tabId).catch(() => ({}));
    const oldUrl = oldTab.url || '';
    
    await chrome.tabs.update(tabId, { url: targetUrl });
    
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await sleep(500);
      try {
        const tab = await chrome.tabs.get(tabId);
        // If we requested a search URL, ensure the tab is actually on a search URL
        // LinkedIn redirects sometimes, so we can't do an exact match, but we can check the path
        const expectedPath = targetUrl.includes('/search/') ? '/search' : 'linkedin.com';
        if (tab.url && tab.url.includes(expectedPath) && tab.status === 'complete') {
          return true;
        }
        // If it's a completely different domain or something weird, just wait a bit
        if (tab.status === 'complete' && (Date.now() - start > 5000)) {
          return true;
        }
      } catch (e) {
        return false;
      }
    }
  } catch (err) {
    console.warn('[LinkMultiplex] navigate error:', err);
  }
  return false;
}

// Scroll the page smoothly to trigger lazy loading — uses scrollBy loop so it's visible
async function scrollWorkerTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const total = Math.max(document.body.scrollHeight, window.innerHeight * 3);
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
          window.scrollTo({ top: (total / steps) * i, behavior: 'smooth' });
          await delay(250);
        }
        await delay(600);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await delay(400);
      }
    });
  } catch (e) {
    console.warn('[LinkMultiplex] Scroll error:', e.message);
  }
}

// SCRAPE: async func that waits for content to appear, then reads the DOM
// Chrome 90+ properly awaits async funcs in executeScript
async function scrapeTab(tabId) {
  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));

        /* ── Wait for ANY result containers to appear (up to 12s) ─────── */
        async function waitForContainers(timeout = 12000) {
          const checks = [
            '.reusable-search__result-container',
            '[data-chameleon-result-urn]',
            '[data-occludable-entity-urn]',
            '.feed-shared-update-v2',
            '.occludable-update',
            'li[class*="search"]',
            'article'
          ];
          const start = Date.now();
          while (Date.now() - start < timeout) {
            for (const s of checks) {
              if (document.querySelectorAll(s).length > 2) return s;
            }
            // Fallback: li elements with profile links
            const liWithProfile = [...document.querySelectorAll('li')]
              .filter(li => li.querySelector('a[href*="/in/"]') && li.innerText.trim().length > 40);
            if (liWithProfile.length > 2) return 'li-profile';
            await delay(400);
          }
          return null;
        }

        /* ── Helpers ─────────────────────────────────────────────────── */
        function clean(el) {
          return el ? el.innerText.trim().replace(/\s+/g, ' ') : '';
        }
        function qs(root, sels) {
          for (const s of sels) {
            try { const e = root.querySelector(s); if (e) return e; } catch (_) {}
          }
          return null;
        }
        function cleanHref(el) {
          if (!el) return '';
          const h = el.getAttribute('href') || '';
          try { return new URL(h, 'https://www.linkedin.com').href.split('?')[0]; } catch (_) { return h; }
        }

        /* ── Find containers using multiple strategies ────────────────── */
        function findContainers() {
          const strategies = [
            ['.reusable-search__result-container', 'reusable-search'],
            ['[data-chameleon-result-urn]', 'chameleon-urn'],
            ['[data-occludable-entity-urn]', 'occludable-urn'],
            ['.feed-shared-update-v2', 'feed-update-v2'],
            ['.occludable-update', 'occludable-update'],
            ['article', 'article']
          ];
          for (const [sel, name] of strategies) {
            const found = [...document.querySelectorAll(sel)];
            if (found.length > 0) return { found, strategy: name };
          }
          // Strategy: <li> with profile link
          const lis = [...document.querySelectorAll('li')].filter(li =>
            li.querySelector('a[href*="/in/"]') && li.innerText.trim().length > 40
          );
          if (lis.length > 0) return { found: lis, strategy: 'li-profile' };

          // Strategy: any data-urn matching post patterns
          const urns = [...document.querySelectorAll('[data-urn]')].filter(el => {
            const u = el.getAttribute('data-urn') || '';
            return u.includes('activity') || u.includes('ugcPost') || u.includes('share');
          });
          if (urns.length > 0) return { found: urns, strategy: 'data-urn' };

          return { found: [], strategy: 'none' };
        }

        /* ── Extract author ──────────────────────────────────────────── */
        function getAuthor(c) {
          const link = qs(c, ['a[href*="/in/"]', '[class*="actor"] a', '[class*="member"] a']);
          if (!link) return { name: '', profileUrl: '', headline: '' };
          const profileUrl = cleanHref(link);
          const nameEl = link.querySelector('span[aria-hidden="true"]')
            || link.querySelector('.t-bold span') || link.querySelector('span') || link;
          const name = clean(nameEl).split('\n')[0].trim();
          const actor = c.querySelector('[class*="actor"]') || c;
          const hEl = actor.querySelector('[class*="description"] span[aria-hidden="true"]')
            || actor.querySelector('[class*="description"]') || actor.querySelector('[class*="subtitle"]');
          return { name, profileUrl, headline: clean(hEl) };
        }

        /* ── Extract post text ───────────────────────────────────────── */
        function getPostText(c) {
          const ltr = c.querySelector('[dir="ltr"]');
          if (ltr && ltr.innerText.trim().length > 5) return clean(ltr);
          const el = qs(c, ['.break-words', '[class*="commentary"]', '[class*="update-components-text"]', '[class*="feed-shared-text"]', '[class*="share-update-card__update-text"]']);
          if (el) return clean(el);
          const blocks = [...c.querySelectorAll('span,p')]
            .map(e => ({ e, t: e.innerText.trim() }))
            .filter(x => x.t.length > 30 && !x.e.closest('a') && !x.e.querySelector('button'))
            .sort((a, b) => b.t.length - a.t.length);
          return blocks.length ? blocks[0].t.replace(/\s+/g, ' ') : '';
        }

        /* ── MAIN ───────────────────────────────────────────────────── */
        const pageUrl = window.location.href;
        const pageType = pageUrl.includes('/people/') ? 'people'
          : (pageUrl.includes('/jobs/search') || pageUrl.includes('/jobs/view')) ? 'jobs'
          : 'posts';

        // Wait for content
        const detectedSelector = await waitForContainers(12000);
        const { found: containers, strategy } = findContainers();

        const results = [];
        const seen = new Set();

        if (pageType === 'posts' || pageType === 'people') {
          containers.forEach(c => {
            if (seen.has(c)) return; seen.add(c);
            const { name, profileUrl, headline } = getAuthor(c);
            const postText = getPostText(c);
            const postUrl = cleanHref(qs(c, [
              'a[href*="/feed/update/"]', 'a[href*="urn:li:activity"]', 'a[href*="/posts/"]'
            ]));
            if (!name && !postText) return;
            results.push({
              type: 'posts',
              author: name || 'LinkedIn Member',
              authorUrl: profileUrl,
              headline,
              postText,
              postUrl: postUrl || pageUrl
            });
          });
        } else {
          containers.forEach(c => {
            if (seen.has(c)) return; seen.add(c);
            const jLink = qs(c, ['a.job-card-list__title', 'a[href*="/jobs/view/"]']);
            const title = clean(jLink);
            if (!title) return;
            results.push({
              type: 'jobs', title, jobUrl: cleanHref(jLink),
              company: clean(qs(c, ['[class*="company-name"]', '[class*="primary-subtitle"]'])),
              location: clean(qs(c, ['[class*="metadata-item"]', '[class*="secondary-subtitle"]']))
            });
          });
        }

        // Debug snapshot — always returned so we can diagnose issues
        const debugSnap = {
          pageUrl,
          detectedSelector,
          strategy,
          containersFound: containers.length,
          bodyPreview: document.body.innerText.substring(0, 300).replace(/\s+/g, ' ')
        };

        return { success: true, pageType, strategy, containersFound: containers.length, data: results, debugSnap };
      }
    });

    const result = injectionResults?.[0]?.result;
    if (!result) return { success: false, error: 'executeScript returned null — tab may have navigated away', data: [], debugSnap: {} };
    console.log(`[LinkMultiplex] strategy=${result.strategy} | containers=${result.containersFound} | items=${result.data.length} | url=${result.debugSnap?.pageUrl}`);
    if (result.containersFound === 0) {
      console.warn('[LinkMultiplex] DEBUG snapshot:', result.debugSnap);
    }
    return result;
  } catch (err) {
    console.error('[LinkMultiplex] executeScript error:', err.message);
    return { success: false, error: err.message, data: [], debugSnap: {} };
  }
}
async function startSearchWorkflow() {
  const selected = state.queries.filter(q => q.enabled);
  const category = el.searchCategory.value;
  const datePosted = el.dateFilter.value;

  if (selected.length === 0) {
    showToast('Please tick at least one query!');
    return;
  }

  state.isSearching = true;
  el.startBtn.classList.add('hidden');
  el.stopBtn.classList.remove('hidden');
  el.progressPanel.classList.remove('hidden');
  updateProgress(0, selected.length, 'Starting…', 'Opening LinkedIn homepage…');

  try {
    // ── Open to LinkedIn HOMEPAGE first (reliable load, not blank search)
    // The tab MUST be active so LinkedIn renders its React DOM
    const workerTab = await chrome.tabs.create({
      url: 'https://www.linkedin.com/',
      active: true
    });
    state.workerTabId = workerTab.id;

    // Wait for homepage to fully load
    await navigateAndWait(state.workerTabId, 'https://www.linkedin.com/', 20000);
    await sleep(2000); // let React hydrate
    console.log('[LinkMultiplex] Homepage loaded, beginning queries.');

    // ── Process each selected query
    for (let i = 0; i < selected.length; i++) {
      if (!state.isSearching) break;
      const query = selected[i];
      updateProgress(i, selected.length, `Query ${i + 1} of ${selected.length}`, `"${query.text}"`);

      for (let page = 1; page <= state.settings.pagesLimit; page++) {
        if (!state.isSearching) break;

        const targetUrl = buildSearchUrl(query.text, category, datePosted, page);
        el.progressSubDetail.textContent = `Navigating: "${query.text}" (page ${page})`;
        console.log('[LinkMultiplex] Navigating to:', targetUrl);

        // Navigate AND wait for URL to actually change
        await navigateAndWait(state.workerTabId, targetUrl, 25000);

        // Give LinkedIn a moment to stabilise after tab load
        el.progressSubDetail.textContent = `Waiting for results to load…`;
        await sleep(4000); // React hydration buffer
        if (!state.isSearching) break;

        // Log actual URL the tab is on (critical for debugging)
        try {
          const tabInfo = await chrome.tabs.get(state.workerTabId);
          console.log('[LinkMultiplex] Tab URL after load:', tabInfo.url);
        } catch (_) {}

        // Scroll to trigger lazy-loaded content
        el.progressSubDetail.textContent = `Scrolling to load more content…`;
        await scrollWorkerTab(state.workerTabId);
        await sleep(2000); // let network requests from scroll complete
        if (!state.isSearching) break;

        // Scrape — retry up to 2× if 0 results
        let result;
        for (let attempt = 1; attempt <= 2; attempt++) {
          el.progressSubDetail.textContent = `Scraping "${query.text}" (attempt ${attempt})…`;
          result = await scrapeTab(state.workerTabId);
          console.log(`[LinkMultiplex] Attempt ${attempt}:`, result.containersFound, 'containers,', result.data?.length, 'items');
          if (result.data?.length > 0) break;
          if (attempt < 2) {
            el.progressSubDetail.textContent = `0 results — retrying in 4s…`;
            await sleep(4000);
          }
        }

        if (result.success && result.data && result.data.length > 0) {
          await mergeScrapedData(result.data, query.text, category);
          showToast(`✓ ${result.data.length} results from "${query.text}" (${result.strategy})`);
        } else if (!result.success) {
          console.warn('[LinkMultiplex] Scrape error:', result.error);
          showToast(`⚠ Error: ${result.error || 'unknown'}`);
        } else {
          // Show debug info so we know what was on the page
          const snap = result.debugSnap || {};
          const shortUrl = (snap.pageUrl || '').replace('https://www.linkedin.com', '');
          showToast(`⚠ 0 results | strategy: ${snap.strategy || 'none'} | url: ${shortUrl || '?'}`);
          console.warn('[LinkMultiplex] 0-result debug:', snap);
        }

        // Safety delay
        if (page < state.settings.pagesLimit || i < selected.length - 1) {
          for (let d = state.settings.delaySeconds; d > 0; d--) {
            if (!state.isSearching) break;
            el.progressSubDetail.textContent = `Safety delay: ${d}s…`;
            await sleep(1000);
          }
        }
      }
    }

    updateProgress(selected.length, selected.length, '✓ Complete!', 'All queries processed.');
    showToast('🎉 Scraping complete!');

  } catch (err) {
    console.error('[LinkMultiplex] Pipeline error:', err);
    showToast(`Error: ${err.message}`);
  } finally {
    await closeWorkerTab();
    resetRunnerUI();
    document.querySelector('[data-tab="tab-results"]').click();
  }
}

async function stopSearchWorkflow() {
  state.isSearching = false;
  el.progressSubDetail.textContent = 'Stopping…';
  await closeWorkerTab();
  showToast('Search stopped.');
  resetRunnerUI();
}

async function closeWorkerTab() {
  if (state.workerTabId) {
    try { await chrome.tabs.remove(state.workerTabId); } catch (_) {}
    state.workerTabId = null;
  }
}

function updateProgress(current, total, status, sub) {
  el.progressStatus.textContent = status;
  el.progressRatio.textContent = `${current}/${total}`;
  el.progressSubDetail.textContent = sub;
  const pct = total > 0 ? (current / total) * 100 : 0;
  el.progressBarFill.style.width = `${pct}%`;
}

function resetRunnerUI() {
  state.isSearching = false;
  el.startBtn.classList.remove('hidden');
  el.stopBtn.classList.add('hidden');
  setTimeout(() => el.progressPanel.classList.add('hidden'), 5000);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Merge scraped data into local DB ────────────────────────────────────────
async function mergeScrapedData(items, queryText, category) {
  let added = 0;
  items.forEach(item => {
    // Determine unique key per category
    const key = category === 'people' ? item.profileUrl
      : category === 'jobs' ? item.jobUrl
      : item.postUrl;

    const idx = state.results.findIndex(r => {
      if (category === 'people') return r.profileUrl === key;
      if (category === 'jobs') return r.jobUrl === key;
      return r.postUrl === key;
    });

    const record = {
      ...item,
      category,
      query: queryText,
      scrapedAt: new Date().toISOString(),
    };

    if (idx > -1) {
      // Update but preserve recruiter status
      const oldStatus = state.results[idx].status;
      state.results[idx] = { ...record, id: state.results[idx].id, status: oldStatus };
    } else {
      state.results.push({ ...record, id: 'r_' + Math.random().toString(36).slice(2, 9), status: 'New' });
      added++;
    }
  });

  await chrome.storage.local.set({ scrapedResults: state.results });
  renderResults();
  populateQueryFilter();
  console.log(`[LinkMultiplex] Merged ${items.length} items — ${added} new.`);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportToCSV() {
  if (state.results.length === 0) { showToast('Nothing to export!'); return; }

  const headers = ['ID', 'Query', 'Category', 'Status', 'Scraped At',
    'Name / Author / Title', 'Headline / Company', 'Location', 'Profile / Post URL', 'Post Text'];

  const rows = state.results.map(item => {
    const name = item.name || item.author || item.title || '';
    const sub = item.headline || item.company || '';
    const loc = item.location || '';
    const url = item.profileUrl || item.postUrl || item.jobUrl || item.authorUrl || '';
    const body = (item.postText || '').replace(/\n/g, ' ');
    return [item.id, item.query, item.category, item.status, item.scrapedAt, name, sub, loc, url, body]
      .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');
  });

  const csv = 'data:text/csv;charset=utf-8,' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
  const a = document.createElement('a');
  a.href = encodeURI(csv);
  a.download = `LinkedIn_Multiplex_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('CSV downloaded!');
}
