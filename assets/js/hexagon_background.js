document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.opacity = '0.2';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let isDarkMode = document.body.classList.contains('dark-mode');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawHexagons();
    }
    
    function drawHexagons() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Define hexagon dimensions for perfect tiling
        const hexSize = 20;
        
        // Correct calculations for a perfect honeycomb
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        
        // For perfect tiling without overlap:
        const horizontalDistance = hexWidth;
        const verticalDistance = hexHeight * 0.75;
        
        // Choose color based on theme with slight transparency
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        
        // Calculate how many hexagons we need
        const columns = Math.ceil(canvas.width / horizontalDistance) + 1;
        const rows = Math.ceil(canvas.height / verticalDistance) + 1;
        
        // Draw the honeycomb pattern
        for (let row = 0; row < rows; row++) {
            const isOddRow = row % 2 === 1;
            const xOffset = isOddRow ? horizontalDistance / 2 : 0;
            
            for (let col = 0; col < columns; col++) {
                const x = col * horizontalDistance + xOffset;
                const y = row * verticalDistance;
                
                // Only draw if at least partially visible
                if (x > -hexWidth && x < canvas.width + hexWidth &&
                    y > -hexHeight && y < canvas.height + hexHeight) {
                    drawHexagon(x, y, hexSize);
                }
            }
        }
    }
    
    function drawHexagon(x, y, size) {
        ctx.beginPath();
        
        // Draw a flat-topped hexagon starting from the top point
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const xPos = x + size * Math.cos(angle);
            const yPos = y + size * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        
        ctx.closePath();
        ctx.stroke();
    }
    
    // Update when theme changes
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            isDarkMode = document.body.classList.contains('dark-mode');
            drawHexagons();
        });
    }
    
    // Observe body class changes (alternative way to detect theme changes)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                isDarkMode = document.body.classList.contains('dark-mode');
                drawHexagons();
            }
        });
    });
    observer.observe(document.body, { attributes: true });
    
    // Add throttling for resize events
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });
    
    // Initial drawing
    resizeCanvas();
});