/* Light touches for the standalone Wall of Love page */
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.wallPage !== 'standalone') return;

    const sparkleLayer = document.getElementById('sparkle-layer');
    if (sparkleLayer) {
        for (let i = 0; i < 25; i++) {
            const s = document.createElement('div');
            s.className = 'sparkle';
            s.style.left = `${Math.random() * 100}%`;
            s.style.top = `${Math.random() * 100}%`;
            s.style.animationDelay = `${Math.random() * 6}s`;
            sparkleLayer.appendChild(s);
        }
    }

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.custom-navbar');
        if (window.scrollY > 40) navbar?.classList.add('scrolled');
        else navbar?.classList.remove('scrolled');
    });
});
