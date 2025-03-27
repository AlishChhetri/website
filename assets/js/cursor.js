document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    let prevX = 0;
    let prevY = 0;
    let trailElements = [];
    const maxTrailLength = 15;
    const fadeOutTime = 1000;
    const minMovement = 5;
    
    // Create a container for all trail elements (create once, reuse)
    const trailContainer = document.createElement('div');
    trailContainer.style.position = 'fixed';
    trailContainer.style.top = '0';
    trailContainer.style.left = '0';
    trailContainer.style.width = '100%';
    trailContainer.style.height = '100%';
    trailContainer.style.pointerEvents = 'none';
    trailContainer.style.zIndex = '9999';
    body.appendChild(trailContainer);
    
    // Throttle function to limit execution rate
    function throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                callback.apply(this, args);
            }
        };
    }
    
    // Mouse move handler (throttled for better performance)
    const handleMouseMove = throttle((e) => {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        
        // Only create trail elements when there's significant movement
        if (Math.abs(dx) + Math.abs(dy) < minMovement) return;
        
        // Calculate angle for dash orientation
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Create a dash element
        const dash = document.createElement('div');
        dash.className = 'bee-trail';
        dash.style.left = `${e.clientX}px`;
        dash.style.top = `${e.clientY}px`;
        dash.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        dash.style.opacity = '0.8';
        dash.style.transition = `opacity ${fadeOutTime}ms linear`;
        
        trailContainer.appendChild(dash);
        trailElements.push(dash);
        
        // Limit trail length
        while (trailElements.length > maxTrailLength) {
            const oldestDash = trailElements.shift();
            if (oldestDash?.parentNode) {
                oldestDash.parentNode.removeChild(oldestDash);
            }
        }
        
        // Update previous position
        prevX = e.clientX;
        prevY = e.clientY;
        
        // Schedule removal with fade effect
        setTimeout(() => {
            dash.style.opacity = '0';
            setTimeout(() => {
                if (dash?.parentNode) {
                    dash.parentNode.removeChild(dash);
                    const index = trailElements.indexOf(dash);
                    if (index > -1) trailElements.splice(index, 1);
                }
            }, fadeOutTime);
        }, 50);
    }, 16); // ~60fps
    
    // Attach the throttled event listener
    document.addEventListener('mousemove', handleMouseMove);
    
    // Listen for dark mode toggle changes
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
        });
    }
    
});