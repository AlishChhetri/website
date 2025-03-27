document.addEventListener('DOMContentLoaded', function() {
    // Search data structure to hold all searchable content
    const searchData = [];
    const searchInput = document.querySelector('.search-container input');
    const searchResults = document.getElementById('searchResults');
    
    // Function to fetch HTML content from a URL
    async function fetchContent(url) {
        try {
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
    
    // Function to extract searchable content from HTML
    function extractContent(html, url) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get the title
        const title = doc.querySelector('title')?.textContent || 'Untitled';
        
        // Get main content text
        const mainElement = doc.querySelector('main');
        const mainContent = mainElement ? mainElement.textContent.trim() : '';
        
        // Get headings
        const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => h.textContent.trim());
        
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
        if (!preview) {
            preview = mainContent.substring(0, 150);
            if (mainContent.length > 150) preview += '...';
        }
        
        // Combine all content for searching
        const content = [
            title,
            ...headings,
            ...paragraphs,
            mainContent
        ].join(' ').toLowerCase();
        
        // Determine content type based on pattern matching
        let type = 'page';
        
        // Pattern-based content type determination
        const urlParts = url.split('/').filter(Boolean);
        const fileName = urlParts[urlParts.length - 1];
        
        // Check for blog pattern (either in directory or filename starting with blog_)
        if (urlParts.includes('blogs') || fileName.startsWith('blog_') || url.includes('/blog.html')) {
            type = 'blog';
        } 
        // Check for project pattern (either in directory or filename starting with project_)
        else if (urlParts.includes('projects') || fileName.startsWith('project_') || url.includes('/projects.html')) {
            type = 'project';
        } 
        // Check for game pattern
        else if (urlParts.includes('games') || fileName.startsWith('game_')) {
            type = 'game';
        }
        
        // Special cases for key pages
        if (fileName === 'index.html' || url === '/' || url.endsWith('/')) {
            type = 'home';
        } else if (fileName === 'about.html') {
            type = 'about';
        }
        
        // Return the searchable item
        return {
            url: url,
            title: title,
            content: content,
            preview: preview,
            type: type
        };
    }
    
    // Pattern-based page discovery
    async function discoverPagesWithPattern() {
        const knownPages = new Set();
        const baseDirectories = [
            '/pages/',
            '/pages/blogs/',
            '/pages/projects/',
            '/pages/games/'
        ];
        
        // Add known root pages
        knownPages.add('/index.html');
        knownPages.add('/pages/about.html');
        knownPages.add('/pages/blog.html');
        knownPages.add('/pages/projects.html');
        
        // Try to discover pattern-based pages
        const patternTemplates = [
            { prefix: '/pages/blogs/blog_', count: 6 },
            { prefix: '/pages/projects/project_', count: 6 },
            { prefix: '/pages/games/game_', count: 6 }
        ];
        
        // Try number-based patterns (blog_one.html, blog_two.html, etc.)
        const numberWords = ['one', 'two', 'three', 'four', 'five', 'six'];
        
        for (const pattern of patternTemplates) {
            // Try both numeric and word-based patterns
            for (let i = 1; i <= pattern.count; i++) {
                // Try numeric pattern (blog_1.html)
                const numericPath = `${pattern.prefix}${i}.html`;
                try {
                    const response = await fetch(new URL(numericPath, window.location.origin).href);
                    if (response.ok) {
                        knownPages.add(numericPath);
                    }
                } catch (error) {
                    // File doesn't exist with numeric pattern, that's OK
                }
                
                // Try word-based pattern (blog_one.html)
                if (i <= numberWords.length) {
                    const wordPath = `${pattern.prefix}${numberWords[i-1]}.html`;
                    try {
                        const response = await fetch(new URL(wordPath, window.location.origin).href);
                        if (response.ok) {
                            knownPages.add(wordPath);
                        }
                    } catch (error) {
                        // File doesn't exist with word pattern, that's OK
                    }
                }
            }
        }
        
        return knownPages;
    }
    
    // Follow links to find additional pages
    async function scanForLinkedPages(knownPages, maxDepth = 2) {
        const allDiscoveredPages = new Set(knownPages);
        const pagesToScan = new Set(knownPages);
        const scannedPages = new Set();
        
        // Process each page up to maxDepth
        for (let depth = 0; depth < maxDepth; depth++) {
            const newPagesToScan = new Set();
            
            for (const pagePath of pagesToScan) {
                if (scannedPages.has(pagePath)) continue;
                
                try {
                    const absolutePath = new URL(pagePath, window.location.origin).href;
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
                        
                        // Normalize the path
                        let normalizedPath = href;
                        
                        // Handle relative paths
                        if (!href.startsWith('/')) {
                            const currentDir = pagePath.substring(0, pagePath.lastIndexOf('/') + 1);
                            const tempUrl = new URL(href, new URL(currentDir, window.location.origin));
                            normalizedPath = tempUrl.pathname;
                        }
                        
                        // Only consider HTML pages
                        if (!normalizedPath.endsWith('.html')) continue;
                        
                        // Apply pattern matching for specific types of pages
                        const parts = normalizedPath.split('/');
                        const fileName = parts[parts.length - 1];
                        
                        // Check if the file matches our pattern naming conventions
                        const isPatternMatch = 
                            fileName.startsWith('blog_') || 
                            fileName.startsWith('project_') || 
                            fileName.startsWith('game_') ||
                            fileName === 'index.html' ||
                            fileName === 'about.html' ||
                            fileName === 'blog.html' ||
                            fileName === 'projects.html';
                        
                        if (isPatternMatch && !allDiscoveredPages.has(normalizedPath)) {
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
            // First, discover pages based on patterns
            const patternPages = await discoverPagesWithPattern();
            
            // Then, scan for linked pages to find additional content
            const allPages = await scanForLinkedPages(patternPages);
            
            console.log("Pages found for indexing:", Array.from(allPages));
            
            // Crawl each page for search indexing
            for (const pagePath of allPages) {
                try {
                    const absolutePath = new URL(pagePath, window.location.origin).href;
                    const html = await fetchContent(absolutePath);
                    
                    if (html) {
                        const pageData = extractContent(html, pagePath);
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
                        type: 'navigation'
                    });
                }
            });
            
            console.log('Search index built with', searchData.length, 'entries');
            console.log('Indexed pages by type:', 
                searchData.reduce((acc, item) => {
                    acc[item.type] = (acc[item.type] || 0) + 1;
                    return acc;
                }, {}));
        } catch (error) {
            console.error('Error building search index:', error);
        }
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
        const results = searchData.filter(item => 
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
            
            // Add each result
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
                
                // Make clickable
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
                        // Navigate to the page
                        window.location.href = result.url;
                    }
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
        if (!query) return text;
        
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
    
    // Attach search input event
    searchInput.addEventListener('input', performSearch);
    
    // Add this function to window to be callable from HTML
    window.performSearch = performSearch;
});