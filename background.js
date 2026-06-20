// Set side panel behavior to open when the user clicks the extension's icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));

// Initialize default queries on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    const { queries } = await chrome.storage.local.get("queries");
    
    // Only set defaults if no queries exist yet
    if (!queries || queries.length === 0) {
      const defaultQueries = [
        { id: "q1", text: "Hiring Product marketing", type: "posts", enabled: true },
        { id: "q2", text: "Join my team product marketing", type: "posts", enabled: true },
        { id: "q3", text: "PMM role", type: "people", enabled: true },
        { id: "q4", text: "I am hiring Product marketing", type: "posts", enabled: true }
      ];
      
      await chrome.storage.local.set({ 
        queries: defaultQueries,
        scrapeSettings: {
          pagesLimit: 1,      // Scrape 1 page per query by default
          delaySeconds: 4,    // 4 seconds delay between pages
          autoScroll: true    // Auto scroll down to trigger lazy loading
        },
        scrapedResults: []    // Initialize empty scraped results
      });
      console.log("Default queries and settings initialized.");
    }
  }
});
