class HexagonNavigation {
    constructor() {
        this.container = document.querySelector('.hexagon-container');
        this.centerHex = document.querySelector('.hexagon-center');
        this.subHexagons = document.querySelectorAll('.hexagon-sub');
        this.currentSection = 'main';
        this.isAnimating = false;
        this.navigationData = null;
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
            this.animate(clickedItem.path);
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
                
                if (item && item.path) {
                    // Extract name from path
                    let name = '';
                    
                    if (item.path.includes('/')) {
                        // If the path is a URL, extract the last part
                        const parts = item.path.split('/');
                        name = parts[parts.length - 1].replace('.html', '');
                        name = name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
                    } else {
                        // If it's a section name, use that directly
                        name = item.path.charAt(0).toUpperCase() + item.path.slice(1).replace(/_/g, ' ');
                    }
                    
                    // Set the text and determine if it's a page or directory
                    textElement.textContent = name;
                    hex.classList.remove('empty');
                    
                    // Detect if it's a directory (no file extension)
                    const isDirectory = !item.path.includes('.html');
                    if (isDirectory) {
                        hex.classList.add('directory');
                        // Update click handler to use path as section name
                        hex.setAttribute('data-section', item.path);
                    } else {
                        hex.classList.remove('directory');
                        // Update click handler to navigate to page
                        hex.setAttribute('data-page', item.path);
                    }
                } else {
                    // Empty hexagon
                    textElement.textContent = '';
                    hex.classList.add('empty');
                    hex.classList.remove('directory');
                    hex.querySelector('.hexagon-svg').style.backgroundImage = '';
                }
            } else {
                // Hide hexagons that don't have corresponding items
                hex.style.display = 'none';
            }
        });

        // Make sure all animation classes are removed when updating content
        this.subHexagons.forEach(hex => {
            hex.classList.remove('coming-in', 'going-out');
        });

        this.currentSection = section;
    }

    // Simplified animate method with simultaneous movement

    animate(sectionKey) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Add animating class to center hexagon
        this.centerHex.classList.add('animating');

        // PHASE 1: All hexagons come to center simultaneously
        this.subHexagons.forEach(hex => {
            if (hex.style.display !== 'none') {
                hex.classList.add('coming-in');
            }
        });

        // PHASE 2: After hexagons meet in center, update content and send them back out
        setTimeout(() => {
            this.updateContent(sectionKey);
            
            // Remove animating class from center after content update
            setTimeout(() => {
                this.centerHex.classList.remove('animating');
            }, 150);
            
            // All hexagons go out simultaneously
            this.subHexagons.forEach(hex => {
                if (hex.style.display !== 'none') {
                    hex.classList.add('going-out');
                    hex.classList.remove('coming-in');
                }
            });
        }, 500); // Timing for the center meeting point

        // Reset positions and cleanup
        setTimeout(() => {
            this.subHexagons.forEach(hex => {
                hex.classList.remove('going-out');
            });
            this.isAnimating = false;
        }, 1000); // Enough time for transitions to complete
    }

    // Update navigateBack method to use the same improved animation logic
    navigateBack() {
        const parentSection = this.navigationData[this.currentSection].parent;
        if (parentSection) {
            this.animate(parentSection);
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HexagonNavigation();
});