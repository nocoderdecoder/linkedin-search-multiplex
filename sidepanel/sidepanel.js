// State variables
let state = {
  queries: [],
  results: [],
  settings: {
    pagesLimit: 1,
    delaySeconds: 4,
    autoScroll: true
  },
  isSearching: false,
  workerTabId: null
};

// DOM Elements
const elements = {
  // Navigation
  tabs: document.querySelectorAll('.nav-tab'),
  panels: document.querySelectorAll('.tab-panel'),
  resultsBadge: document.getElementById('results-count-badge'),
  
  // Search Panel
  addQueryForm: document.getElementById('add-query-form'),
  queryInput: document.getElementById('query-input'),
  queriesList: document.getElementById('queries-list'),
  selectAllQueries: document.getElementById('select-all-queries'),
  deselectAllQueries: document.getElementById('deselect-all-queries'),
  searchCategory: document.getElementById('search-category'),
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),
  
  // Progress Panel
  progressPanel: document.getElementById('progress-panel'),
  progressStatus: document.getElementById('progress-status-label'),
  progressRatio: document.getElementById('progress-ratio'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressSubDetail: document.getElementById('progress-sub-detail'),
  
  // Results Panel
  resultsSearch: document.getElementById('results-search'),
  filterQuery: document.getElementById('filter-query'),
  filterStatus: document.getElementById('filter-status'),
  resultsFeed: document.getElementById('results-feed'),
  noResultsMsg: document.getElementById('no-results-msg'),
  exportCsvBtn: document.getElementById('export-csv-btn'),
  clearDataBtn: document.getElementById('clear-data-btn'),
  
  // Settings Panel
  settingPagesLimit: document.getElementById('setting-pages-limit'),
  settingDelay: document.getElementById('setting-delay'),
  settingAutoscroll: document.getElementById('setting-autoscroll'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// --- Initialization ---
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

// Load state from chrome.storage.local
async function loadStateFromStorage() {
  const data = await chrome.storage.local.get(['queries', 'scrapedResults', 'scrapeSettings']);
  
  if (data.queries) {
    state.queries = data.queries;
  }
  if (data.scrapedResults) {
    state.results = data.scrapedResults;
  }
  if (data.scrapeSettings) {
    state.settings = data.scrapeSettings;
    
    // Set settings UI values
    elements.settingPagesLimit.value = state.settings.pagesLimit;
    elements.settingDelay.value = state.settings.delaySeconds;
    elements.settingAutoscroll.checked = state.settings.autoScroll;
  }
}

// Navigation Tabs Toggle
function initNavigation() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('data-tab');
      
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(targetPanelId).classList.add('active');
    });
  });
}

// Show toast notifications
function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, duration);
}

// --- Query Management Section ---
function initQueryManagement() {
  // Add Query Form Submission
  elements.addQueryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const queryText = elements.queryInput.value.trim();
    if (!queryText) return;
    
    // Check if query already exists
    const exists = state.queries.some(q => q.text.toLowerCase() === queryText.toLowerCase());
    if (exists) {
      showToast("Query already exists!");
      return;
    }
    
    const newQuery = {
      id: 'q_' + Date.now(),
      text: queryText,
      type: 'posts', // Default type
      enabled: true
    };
    
    state.queries.push(newQuery);
    await chrome.storage.local.set({ queries: state.queries });
    
    elements.queryInput.value = '';
    renderQueries();
    populateQueryFilter();
    showToast("Query added successfully");
  });
  
  // Select All/None
  elements.selectAllQueries.addEventListener('click', async () => {
    state.queries.forEach(q => q.enabled = true);
    await chrome.storage.local.set({ queries: state.queries });
    renderQueries();
  });
  
  elements.deselectAllQueries.addEventListener('click', async () => {
    state.queries.forEach(q => q.enabled = false);
    await chrome.storage.local.set({ queries: state.queries });
    renderQueries();
  });
}

// Render queries in the checklist
function renderQueries() {
  elements.queriesList.innerHTML = '';
  
  if (state.queries.length === 0) {
    elements.queriesList.innerHTML = '<div style="padding: 12px; font-size: 11px; color: var(--text-muted); text-align: center;">No queries added yet.</div>';
    return;
  }
  
  state.queries.forEach(query => {
    const item = document.createElement('div');
    item.className = 'query-item';
    
    // Checkbox and label
    const label = document.createElement('label');
    label.className = 'query-checkbox-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = query.enabled;
    checkbox.addEventListener('change', async () => {
      query.enabled = checkbox.checked;
      await chrome.storage.local.set({ queries: state.queries });
    });
    
    const textSpan = document.createElement('span');
    textSpan.className = 'query-text';
    textSpan.textContent = query.text;
    
    label.appendChild(checkbox);
    label.appendChild(textSpan);
    
    // Type badge (Posts/People/Jobs)
    const badge = document.createElement('span');
    badge.className = 'query-badge';
    badge.textContent = query.type || 'posts';
    
    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-query-btn';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      state.queries = state.queries.filter(q => q.id !== query.id);
      await chrome.storage.local.set({ queries: state.queries });
      renderQueries();
      populateQueryFilter();
    });
    
    item.appendChild(label);
    item.appendChild(badge);
    item.appendChild(deleteBtn);
    
    elements.queriesList.appendChild(item);
  });
}

// --- Settings Listeners ---
function initSettingsListeners() {
  // Update setting values in state & storage when user changes them
  elements.settingPagesLimit.addEventListener('change', async () => {
    state.settings.pagesLimit = parseInt(elements.settingPagesLimit.value);
    await saveSettings();
  });
  
  elements.settingDelay.addEventListener('change', async () => {
    state.settings.delaySeconds = parseInt(elements.settingDelay.value);
    await saveSettings();
  });
  
  elements.settingAutoscroll.addEventListener('change', async () => {
    state.settings.autoScroll = elements.settingAutoscroll.checked;
    await saveSettings();
  });
}

async function saveSettings() {
  await chrome.storage.local.set({ scrapeSettings: state.settings });
  showToast("Settings saved");
}

// --- Results Filter and Render ---
function initResultsListeners() {
  elements.resultsSearch.addEventListener('input', renderResults);
  elements.filterQuery.addEventListener('change', renderResults);
  elements.filterStatus.addEventListener('change', renderResults);
  
  // Reset Data Button
  elements.clearDataBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to clear all scraped candidate/post results? This action cannot be undone.")) {
      state.results = [];
      await chrome.storage.local.set({ scrapedResults: [] });
      renderResults();
      populateQueryFilter();
      showToast("Database reset successfully");
    }
  });
  
  // CSV Export Button
  elements.exportCsvBtn.addEventListener('click', exportToCSV);
}

// Populate the query dropdown filter in results
function populateQueryFilter() {
  const currentSelect = elements.filterQuery.value;
  elements.filterQuery.innerHTML = '<option value="all">All Queries</option>';
  
  // Extract unique query texts that exist in results
  const uniqueQueries = [...new Set(state.results.map(r => r.query))];
  
  uniqueQueries.forEach(queryText => {
    const opt = document.createElement('option');
    opt.value = queryText;
    opt.textContent = queryText;
    elements.filterQuery.appendChild(opt);
  });
  
  // Re-select if it still exists
  if (uniqueQueries.includes(currentSelect)) {
    elements.filterQuery.value = currentSelect;
  }
}

// Render filtered search results in the results tab
function renderResults() {
  const searchTerm = elements.resultsSearch.value.toLowerCase().trim();
  const selectedQuery = elements.filterQuery.value;
  const selectedStatus = elements.filterStatus.value;
  
  // Filter the results
  const filtered = state.results.filter(item => {
    // 1. Text Search Filter
    let textMatches = true;
    if (searchTerm) {
      const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm);
      const headlineMatch = item.headline && item.headline.toLowerCase().includes(searchTerm);
      const authorMatch = item.author && item.author.toLowerCase().includes(searchTerm);
      const textMatch = item.text && item.text.toLowerCase().includes(searchTerm);
      const titleMatch = item.title && item.title.toLowerCase().includes(searchTerm);
      const companyMatch = item.company && item.company.toLowerCase().includes(searchTerm);
      
      textMatches = nameMatch || headlineMatch || authorMatch || textMatch || titleMatch || companyMatch;
    }
    
    // 2. Query filter
    const queryMatches = (selectedQuery === 'all' || item.query === selectedQuery);
    
    // 3. Status filter
    const statusMatches = (selectedStatus === 'all' || item.status === selectedStatus);
    
    return textMatches && queryMatches && statusMatches;
  });
  
  // Update badge count
  const newCount = state.results.filter(r => r.status === 'New').length;
  if (newCount > 0) {
    elements.resultsBadge.textContent = newCount;
    elements.resultsBadge.classList.remove('hidden');
  } else {
    elements.resultsBadge.classList.add('hidden');
  }
  
  // Render cards
  elements.resultsFeed.innerHTML = '';
  
  if (filtered.length === 0) {
    elements.noResultsMsg.classList.remove('hidden');
    return;
  }
  
  elements.noResultsMsg.classList.add('hidden');
  
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    // Create card header block
    const header = document.createElement('div');
    header.className = 'result-card-header';
    
    const titleBlock = document.createElement('div');
    titleBlock.className = 'result-title-block';
    
    let mainTitleHtml = '';
    let subtitleHtml = '';
    let metaHtml = '';
    let contentHtml = '';
    let linkUrl = '';
    let linkLabel = '';
    
    if (item.category === 'people') {
      linkUrl = item.profileUrl;
      linkLabel = 'View Profile';
      mainTitleHtml = item.profileUrl 
        ? `<a href="${item.profileUrl}" target="_blank">${item.name}</a>`
        : item.name;
        
      subtitleHtml = item.headline ? `<div class="result-sub-title">${item.headline}</div>` : '';
      
      const connectionBadge = item.connection ? `<span class="badge-status skipped">${item.connection}</span>` : '';
      metaHtml = `
        <div class="result-meta-row">
          <div class="result-meta-item">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${item.location || 'Unknown Location'}</span>
          </div>
          ${connectionBadge}
        </div>
      `;
    } else if (item.category === 'posts') {
      linkUrl = item.postLink;
      linkLabel = 'View Post';
      mainTitleHtml = item.authorLink
        ? `<a href="${item.authorLink}" target="_blank">${item.author}</a>`
        : item.author;
      
      subtitleHtml = `<div class="result-sub-title">Shared a post</div>`;
      
      metaHtml = `
        <div class="result-meta-row">
          <div class="result-meta-item">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Scraped: ${new Date(item.scrapedAt).toLocaleDateString()}</span>
          </div>
        </div>
      `;
      
      contentHtml = `
        <div class="post-content-block collapsed">
          ${item.text}
        </div>
      `;
    } else if (item.category === 'jobs') {
      linkUrl = item.jobLink;
      linkLabel = 'View Job';
      mainTitleHtml = item.jobLink
        ? `<a href="${item.jobLink}" target="_blank">${item.title}</a>`
        : item.title;
        
      subtitleHtml = `<div class="result-sub-title">at <strong>${item.company || 'Unknown Company'}</strong></div>`;
      
      metaHtml = `
        <div class="result-meta-row">
          <div class="result-meta-item">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${item.location || 'Unknown Location'}</span>
          </div>
        </div>
      `;
    }
    
    // Status Badge at top right
    const statusClass = (item.status || 'New').toLowerCase();
    const badge = document.createElement('span');
    badge.className = `badge-status ${statusClass}`;
    badge.textContent = item.status || 'New';
    
    titleBlock.innerHTML = `
      <div class="result-main-title">${mainTitleHtml}</div>
      ${subtitleHtml}
      ${metaHtml}
    `;
    
    header.appendChild(titleBlock);
    header.appendChild(badge);
    
    card.appendChild(header);
    
    if (contentHtml) {
      const contentWrapper = document.createElement('div');
      contentWrapper.innerHTML = contentHtml;
      
      // Expandable post text event
      const textBlock = contentWrapper.querySelector('.post-content-block');
      if (textBlock) {
        textBlock.addEventListener('click', () => {
          textBlock.classList.toggle('collapsed');
        });
      }
      
      card.appendChild(contentWrapper);
    }
    
    // Footer row: Status select dropdown + open url button
    const actionsRow = document.createElement('div');
    actionsRow.className = 'result-card-actions';
    
    // Dropdown to update status
    const statusSelect = document.createElement('select');
    statusSelect.className = 'card-status-select';
    
    const statuses = ['New', 'Contacted', 'Skipped'];
    statuses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === item.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    
    statusSelect.addEventListener('change', async () => {
      const newStatus = statusSelect.value;
      
      // Find item in state and update
      const dbItem = state.results.find(r => r.id === item.id);
      if (dbItem) {
        dbItem.status = newStatus;
        await chrome.storage.local.set({ scrapedResults: state.results });
        renderResults();
        showToast(`Status updated to ${newStatus}`);
      }
    });
    
    // Open Link button
    let linkBtnHtml = '';
    if (linkUrl) {
      linkBtnHtml = `
        <a href="${linkUrl}" target="_blank" class="card-link-icon-btn">
          <span>${linkLabel}</span>
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
        </a>
      `;
    }
    
    actionsRow.appendChild(statusSelect);
    if (linkBtnHtml) {
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = linkBtnHtml;
      actionsRow.appendChild(tempWrapper.firstElementChild);
    }
    
    card.appendChild(actionsRow);
    elements.resultsFeed.appendChild(card);
  });
}

// --- Sequential Search Automation Pipeline ---
function initSearchRunner() {
  elements.startBtn.addEventListener('click', startSearchWorkflow);
  elements.stopBtn.addEventListener('click', stopSearchWorkflow);
  
  // Listen for completed scraping updates from content scripts
  chrome.runtime.onMessage.addListener((message, sender) => {
    // Verified it's from the tab we control
    if (message.type === 'SCRAPE_COMPLETED' && state.workerTabId && sender.tab && sender.tab.id === state.workerTabId) {
      handleScrapedData(message);
    }
  });
}

// Promise wrapper to wait for a tab to finish loading
function waitTabLoaded(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timed out"));
    }, 15000); // 15 seconds max wait per page load
    
    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Run the scraping workflow sequentially
async function startSearchWorkflow() {
  // Sync selected target list
  const selectedQueries = state.queries.filter(q => q.enabled);
  const category = elements.searchCategory.value;
  
  if (selectedQueries.length === 0) {
    showToast("Please select at least one query checkbox!");
    return;
  }
  
  state.isSearching = true;
  elements.startBtn.classList.add('hidden');
  elements.stopBtn.classList.remove('hidden');
  elements.progressPanel.classList.remove('hidden');
  
  updateProgress(0, selectedQueries.length, "Starting...", "Initializing worker tab...");
  
  try {
    // 1. Create the worker tab (hidden-ish, unselected foreground)
    const workerTab = await chrome.tabs.create({
      url: 'https://www.linkedin.com',
      active: false
    });
    state.workerTabId = workerTab.id;
    
    // Update types of checked queries to match selection category
    selectedQueries.forEach(q => q.type = category);
    await chrome.storage.local.set({ queries: state.queries });
    renderQueries();
    
    // 2. Loop through each query
    for (let i = 0; i < selectedQueries.length; i++) {
      if (!state.isSearching) break;
      
      const query = selectedQueries[i];
      const queryText = query.text;
      
      updateProgress(i, selectedQueries.length, `Running queries...`, `Current: "${queryText}"`);
      
      // Loop through pages
      const pagesLimit = state.settings.pagesLimit;
      for (let page = 1; page <= pagesLimit; page++) {
        if (!state.isSearching) break;
        
        elements.progressSubDetail.textContent = `Query: "${queryText}" (Page ${page}/${pagesLimit})`;
        
        // Construct target LinkedIn URL
        let baseUrl = '';
        if (category === 'people') {
          baseUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(queryText)}&page=${page}`;
        } else if (category === 'posts') {
          baseUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(queryText)}&page=${page}`;
        } else if (category === 'jobs') {
          baseUrl = `https://www.linkedin.com/search/results/jobs/?keywords=${encodeURIComponent(queryText)}&page=${page}`;
        }
        
        console.log(`[LinkMultiplex] Navigating worker tab to page ${page}: ${baseUrl}`);
        
        // Load the page
        const loadPromise = waitTabLoaded(state.workerTabId);
        await chrome.tabs.update(state.workerTabId, { url: baseUrl });
        await loadPromise;
        
        // Wait 1.5s additional settling delay before scraping
        await new Promise(r => setTimeout(r, 1500));
        if (!state.isSearching) break;
        
        // Inject content scraper script
        await chrome.scripting.executeScript({
          target: { tabId: state.workerTabId },
          files: ['content/content.js']
        });
        
        // Wait for scrape completed message (handled asynchronously by chrome.runtime.onMessage listener)
        const scrapeResult = await waitForScrapeMessage();
        
        if (scrapeResult.success && scrapeResult.data.length > 0) {
          // Process and save scraped data
          await mergeScrapedData(scrapeResult.data, queryText, category);
        } else if (!scrapeResult.success) {
          console.warn(`[LinkMultiplex] Scrape error reported: ${scrapeResult.error}`);
        } else {
          console.log("[LinkMultiplex] No results found on page.");
        }
        
        // Safety Delay between page loads
        if (page < pagesLimit || i < selectedQueries.length - 1) {
          const delayMs = state.settings.delaySeconds * 1000;
          for (let d = delayMs; d > 0; d -= 1000) {
            if (!state.isSearching) break;
            elements.progressSubDetail.textContent = `Delaying for safety... (${d / 1000}s remaining)`;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    }
    
    // Complete
    updateProgress(selectedQueries.length, selectedQueries.length, "Scrape Run Complete!", "All target queries processed.");
    showToast("Scraping completed successfully!");
    
  } catch (err) {
    console.error("[LinkMultiplex] Scraper pipeline failed:", err);
    showToast(`Error: ${err.message}`);
  } finally {
    await cleanWorkerTab();
    resetRunnerUI();
  }
}

// Cleanly handles closing the scraping worker tab
async function cleanWorkerTab() {
  if (state.workerTabId) {
    try {
      await chrome.tabs.remove(state.workerTabId);
    } catch (e) {
      // tab might already be closed
    }
    state.workerTabId = null;
  }
}

// Promisified listener for scraping completion message
function waitForScrapeMessage() {
  return new Promise((resolve) => {
    // Set a fail-safe timeout in case content script fails to message back
    const timeout = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(tempListener);
      resolve({ success: false, error: "Scrape response timeout", data: [] });
    }, 12000); // 12 seconds fail-safe (scrolling takes ~2-3 seconds)
    
    function tempListener(msg, sender) {
      if ((msg.type === 'SCRAPE_COMPLETED') && state.workerTabId && sender.tab && sender.tab.id === state.workerTabId) {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(tempListener);
        resolve(msg);
      }
    }
    chrome.runtime.onMessage.addListener(tempListener);
  });
}

// Parse and merge scraped data into local database, avoiding duplicate URLs
async function mergeScrapedData(scrapedItems, queryText, category) {
  let addedCount = 0;
  
  scrapedItems.forEach(item => {
    // Generate unique identification comparison key based on URLs
    let uniqueKey = '';
    if (category === 'people') uniqueKey = item.profileUrl;
    else if (category === 'posts') uniqueKey = item.postLink;
    else if (category === 'jobs') uniqueKey = item.jobLink;
    
    // Check if item already exists in database
    const existingIndex = state.results.findIndex(r => {
      if (category === 'people') return r.profileUrl === uniqueKey;
      if (category === 'posts') return r.postLink === uniqueKey;
      if (category === 'jobs') return r.jobLink === uniqueKey;
      return false;
    });
    
    if (existingIndex > -1) {
      // Update existing item with newer data (preserve status)
      const existingStatus = state.results[existingIndex].status;
      state.results[existingIndex] = {
        ...item,
        id: state.results[existingIndex].id,
        query: queryText,
        scrapedAt: new Date().toISOString(),
        status: existingStatus // Preserve New/Contacted/Skipped
      };
    } else {
      // Add as new entry
      state.results.push({
        ...item,
        id: 'res_' + Math.random().toString(36).substr(2, 9),
        query: queryText,
        scrapedAt: new Date().toISOString(),
        status: 'New'
      });
      addedCount++;
    }
  });
  
  await chrome.storage.local.set({ scrapedResults: state.results });
  renderResults();
  populateQueryFilter();
  console.log(`[LinkMultiplex] Merged ${scrapedItems.length} items. Added ${addedCount} new.`);
}

// User clicked STOP search workflow
async function stopSearchWorkflow() {
  state.isSearching = false;
  elements.progressSubDetail.textContent = "Aborting operations...";
  await cleanWorkerTab();
  showToast("Search workflow stopped by user.");
  resetRunnerUI();
}

// Update search pipeline progress bar UI
function updateProgress(current, total, statusText, subText) {
  elements.progressStatus.textContent = statusText;
  elements.progressRatio.textContent = `${current}/${total}`;
  elements.progressSubDetail.textContent = subText;
  
  const pct = total > 0 ? (current / total) * 100 : 0;
  elements.progressBarFill.style.width = `${pct}%`;
}

// Revert search run buttons UI
function resetRunnerUI() {
  state.isSearching = false;
  elements.startBtn.classList.remove('hidden');
  elements.stopBtn.classList.add('hidden');
  setTimeout(() => {
    elements.progressPanel.classList.add('hidden');
  }, 4000); // Keep progress bar visible for 4s after completion
}

// --- CSV Export Generation ---
function exportToCSV() {
  if (state.results.length === 0) {
    showToast("No data to export!");
    return;
  }
  
  // Header row based on columns
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Headers
  const headers = ["ID", "Query Keyword", "Category", "Scraped At", "Recruitment Status", "Name/Title", "Source URL", "Subtitle/Company", "Location", "Details/Content"];
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";
  
  // Data rows
  state.results.forEach(item => {
    let title = "";
    let url = "";
    let subtitle = "";
    let location = "";
    let details = "";
    
    if (item.category === 'people') {
      title = item.name;
      url = item.profileUrl;
      subtitle = item.headline;
      location = item.location;
      details = `Connection: ${item.connection || ''}`;
    } else if (item.category === 'posts') {
      title = item.author;
      url = item.postLink;
      subtitle = "Shared a post";
      location = "";
      details = item.text;
    } else if (item.category === 'jobs') {
      title = item.title;
      url = item.jobLink;
      subtitle = item.company;
      location = item.location;
      details = "";
    }
    
    const row = [
      item.id,
      item.query,
      item.category,
      item.scrapedAt,
      item.status,
      title,
      url,
      subtitle,
      location,
      details
    ];
    
    csvContent += row.map(val => {
      const cleanVal = (val || "").toString().replace(/"/g, '""');
      return `"${cleanVal}"`;
    }).join(",") + "\r\n";
  });
  
  // Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `LinkedIn_Multiplex_Recruits_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  showToast("CSV Export downloaded!");
}
