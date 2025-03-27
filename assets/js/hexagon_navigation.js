class HexagonNavigation {
    constructor() {
        this.container = document.querySelector('.hexagon-container');
        this.centerHex = document.querySelector('.hexagon-center');
        this.subHexagons = document.querySelectorAll('.hexagon-sub');
        this.currentSection = 'main';
        this.isAnimating = false;
        this.navigationData = null;

        // Set all sub-hexagons to empty by default - ONLY CLASS STATE, NOT DIRECT STYLING
        this.subHexagons.forEach(hex => {
            hex.classList.add('empty');
        });

        this.init();
    }

    async init() {
        try {
            // Fetch the navigation data from the pages.json file
            const response = await fetch('./assets/js/pages.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch pages.json: ${response.status}`);
            }
            this.navigationData = await response.json();
            
            // Initialize the content with the main section
            this.updateContent('main');
            
            // Add event listeners to hexagons
            this.subHexagons.forEach((hex, index) => {
                hex.addEventListener('click', (event) => {
                    if (!this.isAnimating) {
                        this.handleHexagonClick(index, event);
                    }
                });
            });

            this.centerHex.addEventListener('click', () => {
                if (!this.isAnimating && this.navigationData[this.currentSection].parent) {
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
            // Fallback to hardcoded data if JSON fetch fails
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        // Fallback navigation data
        this.navigationData = {
            'main': {
                center: 'Navigation',
                parent: null,
                subs: [
                    { name: 'Projects', type: 'page', path: './pages/portfolio/project_one.html' },
                    { name: 'About', type: 'page', path: './pages/about.html' },
                    { name: 'Contact', type: 'directory', path: 'contact' },
                    { name: 'Blog', type: 'page', path: './pages/blog.html' },
                    { name: 'Resources', type: 'directory', path: 'resources' },
                    { name: 'Portfolio', type: 'page', path: './pages/portfolio.html' }
                ]
            }
        };
        
        this.updateContent('main');
    }

    handleHexagonClick(index, event) {
        const section = this.navigationData[this.currentSection];
        if (!section || !section.subs || index >= section.subs.length) return;
        
        const clickedItem = section.subs[index];
        
        // Skip if empty hexagon or no path
        if (!clickedItem || !clickedItem.path) return;

        // Handle navigation based on path type
        if (clickedItem.path.includes('.html')) {
            // It's a page link
            window.location.href = clickedItem.path;
        } else {
            // It's a directory/section
            event.preventDefault();
            this.changeSection(clickedItem.path);
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