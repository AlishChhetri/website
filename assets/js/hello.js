document.addEventListener('DOMContentLoaded', () => {
    // Get the greeting element
    const greetingElement = document.querySelector('.hero-content h2');
    if (!greetingElement) return;

    // Array of greetings in different languages
    const greetings = [
        "Hello 👋🏽,",
        "Namaste 🙏🏽,",
        // "Hola,",
        // "Bonjour,",
        // "Konnichiwa,",
        // "Ciao,",
        // "Nǐ hǎo,",
        // "Anyoung,",
        // "Salaam,"
    ];

    let currentIndex = 0;
    let animating = false;

    // Function to animate the transition between greetings
    const animateGreeting = () => {
        if (animating) return;
        animating = true;

        // Fade out
        greetingElement.style.opacity = '0';
        greetingElement.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            // Update text
            currentIndex = (currentIndex + 1) % greetings.length;
            greetingElement.textContent = greetings[currentIndex];

            // Fade in
            greetingElement.style.opacity = '1';
            greetingElement.style.transform = 'translateY(0)';
            
            animating = false;
        }, 500); // Half a second for transition
    };

    // Initialize with first greeting
    greetingElement.textContent = greetings[0];

    // Add transition effects to the greeting
    greetingElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    // Set interval to change greeting every 3 seconds
    setInterval(animateGreeting, 3000);
});