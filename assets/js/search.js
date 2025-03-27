document.addEventListener('DOMContentLoaded', function() {
    // Search data structure to hold all searchable content
    const searchData = [];
    const searchInput = document.querySelector('.search-container input');
    const searchResults = document.getElementById('searchResults');
    
    // Explicitly set the full base URL for GitHub Pages deployment
    const fullBaseUrl = 'https://alishchhetri.github.io/website';
    const baseUrl = '/website';
    
    // Function to determine the current hostname and protocol
    function getOriginUrl() {
        return window.location.origin;
    }
    
    // Function to normalize a URL with the correct base path
    function normalizeUrl(url) {
        // If it's already an absolute URL with http/https, return it
        if (url.startsWith('http')) {
            return url;
        }
        
        // Handle absolute paths within the site
        if (url.startsWith('/')) {
            // If it already includes the baseUrl, don't duplicate it
            if (url.startsWith(baseUrl + '/') || url === baseUrl) {
                return url;
            }
            return baseUrl + url;
        }
        
        // Ensure relative URLs have a leading slash
        return baseUrl + '/' + url;
    }
    
    // Function to fetch HTML content from a URL
    async function fetchContent(url) {
        try {
            // Make sure we use the correct base URL for absolute path resolution
            let normalizedUrl;
            
            if (url.startsWith('http')) {
                normalizedUrl = url;
            } else {
                // Handle relative and absolute paths
                const relativeUrl = normalizeUrl(url);
                normalizedUrl = new URL(relativeUrl, getOriginUrl()).href;
            }
            
            console.log("Fetching:", normalizedUrl);
            const response = await fetch(normalizedUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${normalizedUrl}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return null;
        }
    }
    
    // Fix link URLs in HTML content
    function fixBlogLinksInHTML(doc) {
        // Find all links in the blog page and fix their URLs
        const links = doc.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && 
                !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                // Fix relative links for blog posts
                if (href.startsWith('/pages/blog/') || href.includes('post_')) {
                    link.setAttribute('href', normalizeUrl(href));
                }
            }
        });
        return doc;
    }
    
    // Discover pages based on common patterns with full URLs
    async function discoverPagesWithPattern() {
        const knownPages = new Set();
        
        // Add known root pages
        knownPages.add('/index.html');
        knownPages.add('/pages/about.html');
        knownPages.add('/pages/blog.html');
        knownPages.add('/pages/projects.html');
        
        // More comprehensive pattern templates with various naming conventions
        const patternTemplates = [
            // Blog patterns
            { prefix: '/pages/blog/post_', count: 10 },
            { prefix: '/pages/blog/blog_', count: 10 },
            
            // Project patterns
            { prefix: '/pages/projects/project_', count: 10 },
            
            // Game patterns
            { prefix: '/pages/games/game_', count: 10 }
        ];
        
        // Various naming patterns to try
        const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
        const numerics = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        
        // For each pattern template, try to discover pages
        for (const pattern of patternTemplates) {
            // Try different naming conventions
            const patternVariations = [
                // Word-based (e.g., blog_one.html)
                ...numberWords.map(word => `${pattern.prefix}${word}.html`),
                // Numeric (e.g., blog_1.html)
                ...numerics.map(num => `${pattern.prefix}${num}.html`)
            ];
            
            // Try each variation
            for (const path of patternVariations) {
                try {
                    const normalizedPath = normalizeUrl(path);
                    const fullPath = new URL(normalizedPath, getOriginUrl()).href;
                    
                    console.log("Checking path:", fullPath);
                    const response = await fetch(fullPath, {method: 'HEAD'});
                    
                    if (response.ok) {
                        console.log("Found page:", path);
                        knownPages.add(path);
                    }
                } catch (error) {
                    // File doesn't exist, that's OK
                    console.log("Path not found:", path);
                }
            }
        }
        
        return knownPages;
    }
    
    // Fix the blog links in the pages
    function fixBlogLinks() {
        // Find all blog post links in the document and update them
        const blogLinks = document.querySelectorAll('a[href^="/pages/blog/"], a[href*="post_"]');
        blogLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) {
                link.setAttribute('href', normalizeUrl(href));
            }
        });
    }
    
    // Main function to build the search index
    async function buildSearchIndex() {
        searchData.length = 0; // Clear existing data
        
        try {
            console.log("Full base URL:", fullBaseUrl);
            console.log("Path base URL:", baseUrl);
            
            // Fix any blog links in the current page
            fixBlogLinks();
            
            // Discover pages based on patterns
            const patternPages = await discoverPagesWithPattern();
            console.log("Pages discovered by pattern:", patternPages.size);
            
            // Convert the Set to Array for logging
            console.log("Found pages:", Array.from(patternPages));
            
            // Crawl each page for search indexing
            for (const pagePath of patternPages) {
                try {
                    const normalizedPath = normalizeUrl(pagePath);
                    const fullPath = new URL(normalizedPath, getOriginUrl()).href;
                    
                    console.log("Indexing:", fullPath);
                    const html = await fetchContent(fullPath);
                    
                    if (html) {
                        const pageData = extractContent(html, pagePath);
                        // Store the normalized URL path for navigation
                        pageData.url = normalizedPath;
                        searchData.push(pageData);
                        console.log("Indexed:", pageData.title);
                    }
                } catch (error) {
                    console.error(`Could not index ${pagePath}:`, error);
                }
            }
            
            console.log('Search index built with', searchData.length, 'entries');
            
            // Set up search debounce
            setupSearchDebounce();
        } catch (error) {
            console.error('Error building search index:', error);
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
                    // Navigate to the page with proper base URL handling
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