document.addEventListener('DOMContentLoaded', function() {
    // Search data structure to hold all searchable content
    const searchData = [];
    const searchInput = document.querySelector('.search-container input');
    const searchResults = document.getElementById('searchResults');
    
    // Detect base URL for GitHub Pages deployment
    const baseUrl = getBaseUrl();
    
    // Function to determine the base URL of the site
    function getBaseUrl() {
        // Check if we're on GitHub Pages with a repo name in the path
        const currentUrl = window.location.href;
        const ghPagesMatch = currentUrl.match(/https?:\/\/[^\/]+\/([^\/]+)\//);
        
        if (ghPagesMatch && ghPagesMatch[1] !== 'pages') {
            return '/' + ghPagesMatch[1];
        }
        
        // Default case for localhost or custom domain
        return '';
    }
    
    // Function to normalize a URL with the correct base path
    function normalizeUrl(url) {
        // If it's already an absolute URL, return it
        if (url.startsWith('http')) {
            return url;
        }
        
        // Ensure URL starts with a slash
        if (!url.startsWith('/')) {
            url = '/' + url;
        }
        
        // Add the base URL
        return baseUrl + url;
    }
    
    // Function to fetch HTML content from a URL
    async function fetchContent(url) {
        try {
            // Make sure we use the correct base URL
            const normalizedUrl = url.startsWith('http') ? url : new URL(normalizeUrl(url), window.location.origin).href;
            
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
    
    // Function to extract searchable content from HTML
    function extractContent(html, url) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get the title
        const title = doc.querySelector('title')?.textContent || 'Untitled';
        
        // Get main content text
        const mainElement = doc.querySelector('main');
        let mainContent = mainElement ? mainElement.textContent.trim() : '';
        
        // If no main element found, try to get content from other containers
        if (!mainContent) {
            const contentContainers = doc.querySelectorAll('.base-body, .blog-content, .portfolio-content, .base-section');
            if (contentContainers.length > 0) {
                mainContent = Array.from(contentContainers).map(container => container.textContent.trim()).join(' ');
            }
        }
        
        // Get headings with weights based on importance
        const headings = [];
        for (const h of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
            // Add headings with repetition based on importance (h1 appears more times than h6)
            const level = parseInt(h.tagName.charAt(1));
            const weight = 7 - level; // h1=6, h2=5, ..., h6=1
            const text = h.textContent.trim();
            for (let i = 0; i < weight; i++) {
                headings.push(text);
            }
        }
        
        // Get paragraphs
        const paragraphs = Array.from(doc.querySelectorAll('p'))
            .map(p => p.textContent.trim());
        
        // Create a smart preview - prefer using actual content paragraphs
        let preview = '';
        if (paragraphs.length > 0) {
            // Use the first substantial paragraph (more than 50 chars)
            for (const paragraph of paragraphs) {
                if (paragraph.length > 50) {
                    preview = paragraph.substring(0, 150);
                    if (paragraph.length > 150) preview += '...';
                    break;
                }
            }
        }
        
        // Fallback to main content if no good paragraph found
        if (!preview && mainContent) {
            preview = mainContent.substring(0, 150);
            if (mainContent.length > 150) preview += '...';
        }
        
        // If still no preview, use the title
        if (!preview) {
            preview = `Page titled "${title}"`;
        }
        
        // Combine all content for searching with weights (title appears multiple times for higher importance)
        const content = [
            title, title, title, // Title has high importance
            ...headings,
            ...paragraphs,
            mainContent
        ].join(' ').toLowerCase();
        
        // Determine content type based on pattern matching
        let type = 'page';
        
        // Pattern-based content type determination - more specific rules first
        const urlParts = url.split('/').filter(Boolean);
        const fileName = urlParts[urlParts.length - 1];
        
        // Detect blog content - check both directory and file naming patterns
        if (urlParts.includes('blog') || urlParts.includes('blogs') || 
            fileName.startsWith('blog_') || fileName.startsWith('post_') || 
            url.includes('/blog.html') || /blog.*\.html$/i.test(fileName)) {
            type = 'blog';
        } 
        // Detect project content
        else if (urlParts.includes('project') || urlParts.includes('projects') || 
                fileName.startsWith('project_') || url.includes('/projects.html') || 
                /project.*\.html$/i.test(fileName)) {
            type = 'project';
        } 
        // Detect game content
        else if (urlParts.includes('game') || urlParts.includes('games') || 
                fileName.startsWith('game_') || /game.*\.html$/i.test(fileName)) {
            type = 'game';
        }
        
        // Special cases for key pages
        if (fileName === 'index.html' || url === '/' || url.endsWith('/')) {
            type = 'home';
        } else if (fileName === 'about.html' || fileName.includes('about')) {
            type = 'about';
        }
        
        // Return the searchable item
        return {
            url: url,
            title: title,
            content: content,
            preview: preview,
            type: type,
            // Include normalized path parts for better filtering
            pathParts: urlParts
        };
    }
    
    // Discover pages based on common patterns
    async function discoverPagesWithPattern() {
        const knownPages = new Set();
        
        // Base directories to explore with base URL
        const baseDirectories = [
            '/',
            '/pages/',
            '/pages/blog/',
            '/pages/blogs/',
            '/pages/projects/',
            '/pages/posts/',
            '/pages/games/'
        ];
        
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
            { prefix: '/pages/blogs/post_', count: 10 },
            { prefix: '/pages/blogs/blog_', count: 10 },
            { prefix: '/pages/posts/post_', count: 10 },
            
            // Project patterns
            { prefix: '/pages/projects/project_', count: 10 },
            { prefix: '/pages/portfolio/project_', count: 10 },
            
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
                ...numerics.map(num => `${pattern.prefix}${num}.html`),
                // Date-based (e.g., blog_2023-01.html)
                ...Array.from({length: 12}, (_, i) => `${pattern.prefix}2023-${String(i+1).padStart(2, '0')}.html`),
                ...Array.from({length: 12}, (_, i) => `${pattern.prefix}2024-${String(i+1).padStart(2, '0')}.html`),
                ...Array.from({length: 3}, (_, i) => `${pattern.prefix}2025-${String(i+1).padStart(2, '0')}.html`)
            ];
            
            // Try each variation
            for (const path of patternVariations) {
                try {
                    const normalizedPath = normalizeUrl(path);
                    const response = await fetch(new URL(normalizedPath, window.location.origin).href, {method: 'HEAD'});
                    if (response.ok) {
                        knownPages.add(path);
                    }
                } catch (error) {
                    // File doesn't exist, that's OK
                }
            }
        }
        
        return knownPages;
    }
    
    // Resolve relative paths to absolute
    function resolveRelativePath(base, relative) {
        // If it's already absolute, return as is
        if (relative.startsWith('/')) {
            return relative;
        }
        
        // If it points to the parent directory
        if (relative.startsWith('../')) {
            // Get the base directory without the file
            const baseDir = base.substring(0, base.lastIndexOf('/'));
            // Move up one directory
            const parentDir = baseDir.substring(0, baseDir.lastIndexOf('/'));
            // Recursively resolve with the new base
            return resolveRelativePath(parentDir + '/', relative.substring(3));
        }
        
        // If it points to the current directory
        if (relative.startsWith('./')) {
            relative = relative.substring(2);
        }
        
        // Get the base directory without the file
        let baseDir = base;
        if (!base.endsWith('/')) {
            baseDir = base.substring(0, base.lastIndexOf('/') + 1);
        }
        
        // Combine base and relative
        return baseDir + relative;
    }
    
    // Follow links to find additional pages with improved directory traversal
    async function scanForLinkedPages(knownPages, maxDepth = 3) {
        const allDiscoveredPages = new Set(knownPages);
        const pagesToScan = new Set(knownPages);
        const scannedPages = new Set();
        
        // Process each page up to maxDepth
        for (let depth = 0; depth < maxDepth; depth++) {
            const newPagesToScan = new Set();
            console.log(`Scanning depth ${depth}, pages to scan: ${pagesToScan.size}`);
            
            for (const pagePath of pagesToScan) {
                if (scannedPages.has(pagePath)) continue;
                
                try {
                    const normalizedPath = normalizeUrl(pagePath);
                    const absolutePath = new URL(normalizedPath, window.location.origin).href;
                    const html = await fetchContent(absolutePath);
                    scannedPages.add(pagePath);
                    
                    if (!html) continue;
                    
                    // Extract links from this page
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const links = Array.from(doc.querySelectorAll('a[href]'));
                    
                    for (const link of links) {
                        let href = link.getAttribute('href');
                        
                        // Skip external links, anchors, etc.
                        if (!href || href.startsWith('http') || href.startsWith('#') || 
                            href.startsWith('mailto:') || href.startsWith('tel:')) {
                            continue;
                        }
                        
                        // Resolve the path relative to the current page
                        let normalizedPath = resolveRelativePath(pagePath, href);
                        
                        // Only consider HTML pages
                        if (!normalizedPath.endsWith('.html')) {
                            // If no extension, check if it might be a directory (add index.html)
                            if (!normalizedPath.includes('.')) {
                                if (!normalizedPath.endsWith('/')) normalizedPath += '/';
                                normalizedPath += 'index.html';
                            } else {
                                continue;
                            }
                        }
                        
                        // Clean up the path
                        normalizedPath = normalizedPath.replace(/\/+/g, '/'); // Remove multiple consecutive slashes
                        
                        // Apply pattern matching for specific types of pages
                        const parts = normalizedPath.split('/').filter(Boolean);
                        const fileName = parts[parts.length - 1];
                        
                        // Match any file following our pattern naming conventions
                        const isPatternMatch = 
                            /^(blog|post|project|game)_.*\.html$/i.test(fileName) ||
                            fileName === 'index.html' ||
                            /^(about|blog|projects|games).*\.html$/i.test(fileName);
                        
                        if ((isPatternMatch || parts.includes('blog') || parts.includes('projects')) && 
                            !allDiscoveredPages.has(normalizedPath)) {
                            allDiscoveredPages.add(normalizedPath);
                            newPagesToScan.add(normalizedPath);
                        }
                    }
                } catch (error) {
                    console.log(`Error scanning links in ${pagePath}:`, error);
                }
            }
            
            // Update the set of pages to scan in the next iteration
            pagesToScan.clear();
            newPagesToScan.forEach(page => pagesToScan.add(page));
            
            // Exit early if no new pages were found
            if (pagesToScan.size === 0) break;
        }
        
        return allDiscoveredPages;
    }
    
    // Main function to build the search index
    async function buildSearchIndex() {
        searchData.length = 0; // Clear existing data
        
        try {
            console.log("Using base URL:", baseUrl);
            
            // First, discover pages based on patterns
            const patternPages = await discoverPagesWithPattern();
            console.log("Pages discovered by pattern:", patternPages.size);
            
            // Then, scan for linked pages to find additional content
            const allPages = await scanForLinkedPages(patternPages);
            console.log("Total pages found for indexing:", allPages.size);
            
            // Crawl each page for search indexing
            for (const pagePath of allPages) {
                try {
                    const normalizedPath = normalizeUrl(pagePath);
                    const absolutePath = new URL(normalizedPath, window.location.origin).href;
                    const html = await fetchContent(absolutePath);
                    
                    if (html) {
                        const pageData = extractContent(html, pagePath);
                        // Store the normalized URL path for navigation
                        pageData.url = normalizedPath;
                        searchData.push(pageData);
                    }
                } catch (error) {
                    console.log(`Could not index ${pagePath}, skipping`);
                }
            }
            
            // Add hexagon navigation items
            const hexagons = document.querySelectorAll('.hexagon-sub');
            hexagons.forEach(hex => {
                const textElement = hex.querySelector('.hexagon-text');
                if (textElement && textElement.textContent.trim()) {
                    searchData.push({
                        url: '#',
                        title: textElement.textContent.trim(),
                        content: textElement.textContent.trim().toLowerCase(),
                        preview: `Navigate to ${textElement.textContent.trim()}`,
                        type: 'navigation',
                        pathParts: []
                    });
                }
            });
            
            console.log('Search index built with', searchData.length, 'entries');
            console.log('Indexed pages by type:', 
                searchData.reduce((acc, item) => {
                    acc[item.type] = (acc[item.type] || 0) + 1;
                    return acc;
                }, {}));
                
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
    
    // Weight search results based on relevance
    function weightSearchResults(results, query) {
        return results.map(result => {
            // Start with a base score
            let score = 1;
            
            // Title match has highest priority
            const titleMatches = (result.title.toLowerCase().match(new RegExp(query, 'g')) || []).length;
            score += titleMatches * 10;
            
            // Exact title match is even better
            if (result.title.toLowerCase() === query) {
                score += 50;
            }
            
            // Content matches
            const contentMatches = (result.content.toLowerCase().match(new RegExp(query, 'g')) || []).length;
            score += contentMatches;
            
            // Boost certain types
            if (result.type === 'blog' || result.type === 'project') {
                score *= 1.2;
            }
            
            // Boost navigation items for quick access
            if (result.type === 'navigation') {
                score *= 1.5;
            }
            
            // Return the weighted result
            return {
                ...result,
                score
            };
        })
        .sort((a, b) => b.score - a.score); // Sort by score descending
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
        
        // Weight and sort results by relevance
        results = weightSearchResults(results, query);
        
        // Group results by type for better organization
        const groupedResults = groupResultsByType(results);
        
        // Display results
        displayResults(groupedResults, results.length, query);
    }
    
    // Group results by type for better organization
    function groupResultsByType(results) {
        const grouped = {};
        
        // Define the display order of types
        const typeOrder = ['navigation', 'blog', 'project', 'home', 'about', 'game', 'page'];
        
        // Initialize groups
        typeOrder.forEach(type => {
            grouped[type] = [];
        });
        
        // Populate groups
        results.forEach(result => {
            if (grouped[result.type]) {
                grouped[result.type].push(result);
            } else {
                grouped.page = grouped.page || [];
                grouped.page.push(result);
            }
        });
        
        return grouped;
    }
    
    // Function to display search results with grouping
    function displayResults(groupedResults, totalCount, query) {
        searchResults.innerHTML = '';
        
        // Show the results container if we have results
        if (totalCount > 0) {
            searchResults.classList.add('active');
            
            // Create header
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.textContent = `Found ${totalCount} result${totalCount !== 1 ? 's' : ''}`;
            searchResults.appendChild(header);
            
            // Define the display order of types
            const typeOrder = ['navigation', 'blog', 'project', 'home', 'about', 'game', 'page'];
            
            // Add results by type
            typeOrder.forEach(type => {
                const results = groupedResults[type] || [];
                if (results.length === 0) return;
                
                // Add type section header if we have multiple types
                if (totalCount > results.length) {
                    const typeHeader = document.createElement('div');
                    typeHeader.className = 'search-results-type-header';
                    typeHeader.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} (${results.length})`;
                    searchResults.appendChild(typeHeader);
                }
                
                // Add results for this type
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
                    
                    // Add preview with highlighted query
                    const preview = document.createElement('p');
                    preview.innerHTML = highlightText(result.preview, query);
                    resultItem.appendChild(preview);
                    
                    // Make clickable with proper URL handling
                    resultItem.addEventListener('click', () => {
                        if (result.type === 'navigation') {
                            // Find and click the hexagon
                            const hexText = result.title;
                            document.querySelectorAll('.hexagon-sub').forEach(hex => {
                                const textElement = hex.querySelector('.hexagon-text');
                                if (textElement && textElement.textContent.trim() === hexText) {
                                    hex.click();
                                    searchResults.classList.remove('active');
                                    searchInput.value = '';
                                }
                            });
                        } else {
                            // Navigate to the page with proper base URL handling
                            window.location.href = result.url;
                        }
                    });
                    
                    searchResults.appendChild(resultItem);
                });
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
    
    // Handle keyboard navigation in search results
    searchInput.addEventListener('keydown', function(e) {
        const results = searchResults.querySelectorAll('.search-result-item');
        const activeResult = searchResults.querySelector('.search-result-item.active');
        let activeIndex = -1;
        
        // Find the currently active result index
        if (activeResult) {
            activeIndex = Array.from(results).indexOf(activeResult);
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (activeIndex < results.length - 1) {
                    if (activeResult) activeResult.classList.remove('active');
                    results[activeIndex + 1].classList.add('active');
                    results[activeIndex + 1].scrollIntoView({ block: 'nearest' });
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (activeIndex > 0) {
                    if (activeResult) activeResult.classList.remove('active');
                    results[activeIndex - 1].classList.add('active');
                    results[activeIndex - 1].scrollIntoView({ block: 'nearest' });
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                // If there's an active result, click it
                if (activeResult) {
                    activeResult.click();
                }
                // If there's no active result but there are search results, click the first one
                else if (results.length > 0) {
                    results[0].click();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                searchResults.classList.remove('active');
                searchInput.blur();
                break;
        }
    });
    
    // Initialize search index when the page loads
    buildSearchIndex();
    
    // Add this function to window to be callable from HTML
    window.performSearch = performSearch;
});
