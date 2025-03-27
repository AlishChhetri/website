document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const modeLabel = document.getElementById('mode-label');

    // Check local storage for saved mode or system preference
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = localStorage.getItem('darkMode');

    if (darkMode === 'enabled' || (darkMode === null && userPrefersDark)) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.checked = false;
    }

    // Simplified toggle animation - no extra elements needed
    darkModeToggle.addEventListener('change', () => {
        const slider = darkModeToggle.nextElementSibling;
        
        // Apply animation class
        slider.classList.add('slider-animating');
        
        // Toggle dark mode
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
        
        // Remove animation class after transition completes
        setTimeout(() => {
            slider.classList.remove('slider-animating');
        }, 500);
    });
});