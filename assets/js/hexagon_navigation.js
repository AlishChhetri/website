class HexagonNavigation {
    constructor() {
        this.container = document.querySelector('.hexagon-container');
        this.centerHex = document.querySelector('.hexagon-center');
        this.subHexagons = document.querySelectorAll('.hexagon-sub');
        this.currentSection = 'main';
        this.isAnimating = false;
        this.navigationData = null;
        this.baseUrl = ''; // Add base URL property

        // Set all sub-hexagons to empty by default - ONLY CLASS STATE, NOT DIRECT STYLING
        this.subHexagons.forEach(hex => {
            hex.classList.add('empty');
        });

        this.init();
    }

    async init() {
        try {
            // Get the navigation data file path
            const dataPath = this.getNavigationDataPath();
            console.log("Attempting to load navigation data from:", dataPath);
            
            // Fetch the navigation data
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch navigation data: ${response.status}`);
            }
            
            const data = await response.json();
            this.navigationData = data;
            
            // Set the base URL from the data if it exists
            if (data.baseUrl) {
                this.baseUrl = data.baseUrl;
                console.log("Using base URL from navigation data:", this.baseUrl);
            }
            
            console.log("Successfully loaded navigation data");
            
            // Initialize the content with the main section
            this.updateContent('main');
            
            // Add click events directly to the hexagon divs
            this.subHexagons.forEach((hex, index) => {
                hex.addEventListener('click', (event) => {
                    // Only handle clicks if not animating and not empty
                    if (!this.isAnimating && !hex.classList.contains('empty')) {
                        this.handleHexagonClick(index, event);
                    }
                });
            });

            // Add click event to center hexagon (parent navigation)
            this.centerHex.addEventListener('click', (event) => {
                if (!this.isAnimating && this.navigationData[this.currentSection]?.parent) {
                    this.navigateBack();
                }
            });
            
            // Set initial state class
            this.centerHex.classList.add('state-idle');
            this.subHexagons.forEach(hex => {
                hex.classList.add('state-idle');
            });
            
        } catch (error) {
            console.error('Error initializing hexagon navigation:', error);
            // Try alternative paths
            this.tryAlternativeDataPaths();
        }
    }

    getNavigationDataPath() {
        // First, try to determine based on script location
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            const src = script.src;
            if (src && src.includes('hexagon_navigation.js')) {
                // If this is our script, the data should be in the same directory
                return src.substring(0, src.lastIndexOf('/') + 1) + 'hexagon_navigation.json';
            }
        }

        // Fallback: determine based on current page location
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/pages/')) {
            // In a subpage
            const depth = currentPath.split('/').filter(Boolean).length - 1;
            return '../'.repeat(depth) + 'assets/js/hexagon_navigation.json';
        } else {
            // In root
            return './assets/js/hexagon_navigation.json';
        }
    }

    async tryAlternativeDataPaths() {
        // Try a series of alternative paths when the main approach fails
        const possiblePaths = [
            './assets/js/hexagon_navigation.json',
            '../assets/js/hexagon_navigation.json',
            '../../assets/js/hexagon_navigation.json',
            '/assets/js/hexagon_navigation.json',
            'hexagon_navigation.json'
        ];
        
        for (const path of possiblePaths) {
            try {
                console.log("Trying alternative path:", path);
                const response = await fetch(path);
                
                if (response.ok) {
                    const data = await response.json();
                    this.navigationData = data;
                    
                    // Set the base URL from the data if it exists
                    if (data.baseUrl) {
                        this.baseUrl = data.baseUrl;
                        console.log("Using base URL from navigation data:", this.baseUrl);
                    }
                    
                    console.log("Successfully loaded navigation data from:", path);
                    
                    // Initialize with loaded data
                    this.updateContent('main');
                    
                    // Set initial state class
                    this.centerHex.classList.add('state-idle');
                    this.subHexagons.forEach(hex => {
                        hex.classList.add('state-idle');
                    });
                    
                    return; // Success, exit method
                }
            } catch (e) {
                console.warn(`Failed to load from ${path}:`, e.message);
            }
        }
        
        // If all paths fail, fall back to hardcoded data
        console.log("All paths failed, using fallback data");
        this.loadFallbackData();
    }

    loadFallbackData() {
        // Fallback navigation data with baseUrl
        this.navigationData = {
            baseUrl: window.location.origin + '/website',
            'main': {
                center: 'Navigation',
                parent: null,
                subs: [
                    { name: 'Projects', type: 'page', path: '/pages/projects.html' },
                    { name: 'About', type: 'page', path: '/pages/about.html' },
                    { name: 'Contact', type: 'directory', path: 'contact' },
                    { name: 'Blog', type: 'page', path: '/pages/blog.html' },
                    { name: 'Resources', type: 'directory', path: 'resources' },
                    { name: 'Portfolio', type: 'page', path: '/pages/portfolio.html' }
                ]
            }
        };
        
        // Set base URL from fallback data
        this.baseUrl = this.navigationData.baseUrl;
        console.log("Using fallback base URL:", this.baseUrl);
        
        this.updateContent('main');
    }

    // Get current page path relative to site root (similar to search.js)
    getCurrentPath() {
        const path = window.location.pathname;
        // If we're on GitHub Pages or similar hosting, handle the repository name in the path
        const basePath = this.baseUrl ? new URL(this.baseUrl).pathname : '';
        if (basePath && path.startsWith(basePath)) {
            return path.substring(basePath.length) || '/';
        }
        return path;
    }

    handleHexagonClick(index, event) {
        const section = this.navigationData[this.currentSection];
        if (!section || !section.subs || index >= section.subs.length) return;
        
        const clickedItem = section.subs[index];
        
        // Skip if empty hexagon or no path
        if (!clickedItem || !clickedItem.path) return;

        // Handle navigation based on path type
        if (clickedItem.path.includes('.html')) {
            // Normalize the URL path based on current location
            const normalizedPath = this.normalizePath(clickedItem.path);
            
            // It's a page link
            window.location.href = normalizedPath;
        } else if (clickedItem.type === 'download') {
            // It's a download - normalize the download path
            const normalizedPath = this.normalizePath(clickedItem.path);
            this.downloadFile(normalizedPath);
        } else {
            // It's a directory/section
            event.preventDefault();
            this.changeSection(clickedItem.path);
        }
    }

    normalizePath(path) {
        // If it's already an absolute URL with http/https, return it
        if (path.startsWith('http')) {
            return path;
        }
        
        // If we have a baseUrl, use it to construct the full URL
        if (this.baseUrl) {
            // Handle both absolute and relative paths
            if (path.startsWith('/')) {
                // For absolute paths (starting with /), directly append to baseUrl
                return this.baseUrl + path;
            } else {
                // For relative paths, we need to determine the current path first
                const currentPath = this.getCurrentPath();
                const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                
                // Combine current directory with the relative path
                let normalizedPath = currentDir + path;
                
                // Handle ".." in paths (up one directory)
                while (normalizedPath.includes('/../')) {
                    const beforeParent = normalizedPath.substring(0, normalizedPath.indexOf('/../'));
                    const parentDir = beforeParent.substring(0, beforeParent.lastIndexOf('/'));
                    const afterParent = normalizedPath.substring(normalizedPath.indexOf('/../') + 4);
                    normalizedPath = parentDir + '/' + afterParent;
                }
                
                // Handle "./" in paths (current directory)
                normalizedPath = normalizedPath.replace(/\/\.\//g, '/');
                
                // Ensure the path starts with /
                if (!normalizedPath.startsWith('/')) {
                    normalizedPath = '/' + normalizedPath;
                }
                
                // Construct full URL with base
                return this.baseUrl + normalizedPath;
            }
        } else {
            // Fallback for when baseUrl isn't available
            // Handle absolute paths from site root
            if (path.startsWith('/')) {
                // Calculate relative path based on current position
                const currentPath = window.location.pathname;
                const pathParts = currentPath.split('/').filter(Boolean);
                
                if (currentPath.includes('/pages/')) {
                    const depth = pathParts.length - 1;
                    return '../'.repeat(depth) + path.substring(1);
                } else {
                    // We're at root
                    return path.substring(1);
                }
            } else {
                // It's already a relative path, return as is
                return path;
            }
        }
    }

    downloadFile(filePath, fileName) {
        const downloadLink = document.createElement('a');
        downloadLink.href = filePath;
        downloadLink.download = fileName || 'download';
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        setTimeout(() => {
            document.body.removeChild(downloadLink);
        }, 100);
    }

    updateContent(section) {
        // Directly access a property of the navigationData object
        const data = this.navigationData[section];
        if (!data) return;

        // Update center text content
        this.centerHex.querySelector('.hexagon-text').textContent = data.center;
        
        // Update parent navigation status
        if (data.parent) {
            this.centerHex.classList.add('has-parent');
        } else {
            this.centerHex.classList.remove('has-parent');
        }

        // Update each sub hexagon
        this.subHexagons.forEach((hex, index) => {
            // Get the text element inside the hexagon
            const textElement = hex.querySelector('.hexagon-text');
            
            // Check if we have an item for this position
            if (index < data.subs.length) {
                const item = data.subs[index];
                hex.style.display = 'flex';
                
                if (item.type === 'empty' || !item.name) {
                    // Empty hexagon - only update the state
                    textElement.textContent = '';
                    hex.classList.add('empty');
                    hex.classList.remove('directory');
                    
                    // Remove any previous attributes
                    hex.removeAttribute('data-section');
                    hex.removeAttribute('data-page');
                    hex.removeAttribute('data-download');
                } else if (item.path) {
                    // Non-empty hexagon with a path
                    textElement.textContent = item.name;
                    hex.classList.remove('empty');
                    
                    // Determine if it's a directory, page, or download
                    if (item.type === 'directory') {
                        hex.classList.add('directory');
                        hex.setAttribute('data-section', item.path);
                        hex.removeAttribute('data-page');
                        hex.removeAttribute('data-download');
                    } else if (item.type === 'page') {
                        hex.classList.remove('directory');
                        hex.setAttribute('data-page', item.path);
                        hex.removeAttribute('data-section');
                        hex.removeAttribute('data-download');
                    } else if (item.type === 'download') {
                        hex.classList.remove('directory');
                        hex.setAttribute('data-download', item.path);
                        hex.removeAttribute('data-section');
                        hex.removeAttribute('data-page');
                    }
                } else if (item.type === 'image') {
                    // Image type but no path (skills section)
                    textElement.textContent = item.name;
                    hex.classList.remove('empty');
                    
                    // Remove any previous attributes
                    hex.removeAttribute('data-section');
                    hex.removeAttribute('data-page');
                    hex.removeAttribute('data-download');
                }
            } else {
                // Hide hexagons that don't have corresponding items
                hex.style.display = 'none';
            }
        });

        this.currentSection = section;
    }

    changeSection(sectionKey) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Execute the animation sequence using CSS state classes
        
        // 1. Center is changing
        this.centerHex.classList.remove('state-idle');
        this.centerHex.classList.add('state-changing');
        
        // 2. All hexagons converge to center
        const visibleHexagons = Array.from(this.subHexagons).filter(hex => hex.style.display !== 'none');
        visibleHexagons.forEach(hex => {
            hex.classList.remove('state-idle');
            hex.classList.add('state-converging');
        });
        
        // 3. After hexagons reach center, update content and begin dispersing
        setTimeout(() => {
            // Update the content
            this.updateContent(sectionKey);
            
            // Prepare for dispersion
            visibleHexagons.forEach(hex => {
                hex.classList.remove('state-converging');
                hex.classList.add('state-dispersing');
            });
            
            // 4. After a short transition, make the new hexagons return to normal
            setTimeout(() => {
                const newVisibleHexagons = Array.from(this.subHexagons).filter(hex => hex.style.display !== 'none');
                newVisibleHexagons.forEach(hex => {
                    hex.classList.remove('state-dispersing');
                    hex.classList.add('state-returning');
                });
                
                this.centerHex.classList.remove('state-changing');
                this.centerHex.classList.add('state-idle');
                
                // 5. Animation sequence complete
                setTimeout(() => {
                    newVisibleHexagons.forEach(hex => {
                        hex.classList.remove('state-returning');
                        hex.classList.add('state-idle');
                    });
                    this.isAnimating = false;
                }, 300);
            }, 150);
        }, 300);
    }

    navigateBack() {
        const parentSection = this.navigationData[this.currentSection].parent;
        if (parentSection) {
            this.changeSection(parentSection);
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HexagonNavigation();
});