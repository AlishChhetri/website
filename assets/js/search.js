document.addEventListener('DOMContentLoaded', function() {
    // Search data structure to hold all searchable content
    const searchData = [];
    const searchInput = document.querySelector('.search-container input');
    const searchResults = document.getElementById('searchResults');
    
    // We'll fetch this from the sitemap.json
    let siteBaseUrl = '';
    
    // Function to normalize a URL with the correct base path
    function normalizeUrl(url) {
        // If it's already an absolute URL with http/https, return it
        if (url.startsWith('http')) {
            return url;
        }
        
        // Handle both absolute and relative paths
        const cleanPath = url.startsWith('/') ? url : '/' + url;
        return siteBaseUrl + cleanPath;
    }
    
    // Function to fetch HTML content from a URL
    async function fetchContent(url) {
        try {
            console.log("Fetching:", url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return null;
        }
    }
    
    // Extract content from HTML for search indexing
    function extractContent(html, url) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get page title
        const title = doc.querySelector('title')?.textContent || 
                      doc.querySelector('h1')?.textContent || 
                      'Untitled Page';
        
        // Get page content (prioritize main content areas)
        const mainContent = doc.querySelector('main, .base-body, .content, article');
        let content = '';
        
        if (mainContent) {
            // Use main content if available
            content = mainContent.textContent;
        } else {
            // Fallback to body content, excluding navigation and footer
            const body = doc.body;
            const nav = doc.querySelector('nav');
            const footer = doc.querySelector('footer');
            
            // Clone body to avoid modifying the original
            const bodyClone = body.cloneNode(true);
            
            // Remove nav and footer if they exist
            if (nav && bodyClone.contains(nav)) bodyClone.removeChild(nav);
            if (footer && bodyClone.contains(footer)) bodyClone.removeChild(footer);
            
            content = bodyClone.textContent;
        }
        
        // Clean up content
        content = content.replace(/\s+/g, ' ').trim().toLowerCase();
        
        // Create a preview (first ~150 characters)
        const preview = content.substring(0, 150) + '...';
        
        // Determine page type from URL 
        let type;
        if (url.includes('/blog/')) {
            type = 'blog';
        } else if (url.includes('/projects/')) {
            type = 'project';
        } else if (url.includes('/about.html')) {
            type = 'about';
        } else if (url.includes('/index.html') || url === '/') {
            type = 'home';
        } else if (url.includes('/games/')) {
            type = 'game';
        } else {
            type = 'page';
        }
        
        return {
            title,
            content,
            preview,
            url,
            type
        };
    }
    
    // Fix any relative links in the current page
    function fixPageLinks() {
        // Find all links in the document
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            // Only fix internal links (not external, anchors, mail, etc.)
            if (href && !href.startsWith('http') && !href.startsWith('#') && 
                !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                
                // Get proper URL with base path
                const fixedHref = normalizeUrl(href);
                link.setAttribute('href', fixedHref);
            }
        });
    }
    
    // Main function to build the search index
    async function buildSearchIndex() {
        searchData.length = 0; // Clear existing data
        
        try {
            // First, get base URL from sitemap before doing anything else
            console.log("Loading sitemap to get base URL...");
            
            // Use a temporary URL for the first fetch only
            // We need a relative URL that will work whether running locally or on GitHub Pages
            const tempSitemapUrl = (window.location.protocol + '//' + window.location.host + 
                                   window.location.pathname).replace(/\/[^\/]*$/, '/assets/js/sitemap.json');
            
            const sitemapResponse = await fetch(tempSitemapUrl);
            if (!sitemapResponse.ok) {
                throw new Error(`Failed to fetch sitemap.json: ${sitemapResponse.status}`);
            }
            
            const sitemapData = await sitemapResponse.json();
            
            // Set the base URL from the sitemap
            siteBaseUrl = sitemapData.baseUrl;
            console.log("Using base URL from sitemap:", siteBaseUrl);
            
            // Now that we have the base URL, fix links in the current page
            fixPageLinks();
            
            console.log("Building search index using sitemap with", sitemapData.sitemap.length, "pages");
            
            // Process each page in the sitemap
            for (const page of sitemapData.sitemap) {
                const fullUrl = normalizeUrl(page.url);
                
                console.log("Indexing:", fullUrl);
                const html = await fetchContent(fullUrl);
                
                if (html) {
                    // Extract content or use sitemap metadata
                    const pageData = extractContent(html, page.url);
                    
                    // Override with sitemap data if available
                    if (page.title) pageData.title = page.title;
                    if (page.badge) pageData.type = page.badge;
                    
                    // Always use the normalized URL for navigation
                    pageData.url = fullUrl;
                    
                    // Add to search index
                    searchData.push(pageData);
                    console.log("Indexed:", pageData.title);
                }
            }
            
            console.log('Search index built with', searchData.length, 'entries');
            
            // Set up search debounce
            setupSearchDebounce();
        } catch (error) {
            console.error('Error building search index:', error);
            // Fallback to a default base URL if something goes wrong
            siteBaseUrl = 'https://alishchhetri.github.io/website';
            console.log("Using fallback base URL:", siteBaseUrl);
        }
    }
    
    // Set up debounced search to avoid excessive processing
    function setupSearchDebounce() {
        let debounceTimer;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performSearch, 300);
        });
        
        // Also search on focus if there's already text
        searchInput.addEventListener('focus', function() {
            if (searchInput.value.trim()) {
                performSearch();
            }
        });
    }
    
    // Function to perform the search
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        // Clear results if query is empty
        if (!query) {
            searchResults.classList.remove('active');
            searchResults.innerHTML = '';
            return;
        }
        
        // Filter search data
        let results = searchData.filter(item => 
            item.content.includes(query) || 
            item.title.toLowerCase().includes(query)
        );
        
        // Sort by relevance (title matches first, then content)
        results.sort((a, b) => {
            const aInTitle = a.title.toLowerCase().includes(query);
            const bInTitle = b.title.toLowerCase().includes(query);
            
            if (aInTitle && !bInTitle) return -1;
            if (!aInTitle && bInTitle) return 1;
            return 0;
        });
        
        // Display results
        displayResults(results, query);
    }
    
    // Function to display search results
    function displayResults(results, query) {
        searchResults.innerHTML = '';
        
        // Show the results container if we have results
        if (results.length > 0) {
            searchResults.classList.add('active');
            
            // Create header
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
            searchResults.appendChild(header);
            
            // Add results
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                // Add result type badge
                const typeBadge = document.createElement('span');
                typeBadge.className = 'result-type-badge ' + result.type;
                typeBadge.textContent = result.type.charAt(0).toUpperCase() + result.type.slice(1);
                resultItem.appendChild(typeBadge);
                
                // Add title with highlighted query
                const title = document.createElement('h4');
                title.innerHTML = highlightText(result.title, query);
                resultItem.appendChild(title);
                
                // Add preview
                const preview = document.createElement('p');
                preview.innerHTML = highlightText(result.preview, query);
                resultItem.appendChild(preview);
                
                // Make clickable
                resultItem.addEventListener('click', () => {
                    // Navigate to the page
                    window.location.href = result.url;
                });
                
                searchResults.appendChild(resultItem);
            });
        } else {
            // Show no results message
            searchResults.classList.add('active');
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = `No results found for "${query}"`;
            searchResults.appendChild(noResults);
        }
    }
    
    // Function to highlight search query in text
    function highlightText(text, query) {
        if (!query || !text) return text || '';
        
        const regex = new RegExp(query, 'gi');
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    }
    
    // Close search results when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('active');
        }
    });

    // Initialize search index when the page loads
    buildSearchIndex();
    
    // Add this function to window to be callable from HTML
    window.performSearch = performSearch;
});