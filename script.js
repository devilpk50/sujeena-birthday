document.addEventListener('DOMContentLoaded', () => {
    const CONFETTI_COLORS = ['#FFD700', '#FFC300', '#E5A900', '#FFF199', '#FF6B9D', '#7BED9F', '#ffffff'];
    const BALLOON_COLORS = ['#FF6B9D', '#FFC300', '#70A1FF', '#7BED9F', '#FF9FF3', '#FFD700', '#FF6348'];

    // ─── Sparkles ───
    const sparkleLayer = document.getElementById('sparkle-layer');
    if (sparkleLayer) {
        for (let i = 0; i < 40; i++) {
            const s = document.createElement('div');
            s.className = 'sparkle';
            s.style.left = `${Math.random() * 100}%`;
            s.style.top = `${Math.random() * 100}%`;
            s.style.animationDelay = `${Math.random() * 6}s`;
            s.style.animationDuration = `${4 + Math.random() * 5}s`;
            sparkleLayer.appendChild(s);
        }
    }

    // ─── Welcome surprise overlay ───
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const giftBox = document.getElementById('giftBox');
    const openGiftBtn = document.getElementById('openGiftBtn');

    function openWelcomeSurprise() {
        if (!welcomeOverlay || welcomeOverlay.classList.contains('hidden')) return;
        giftBox?.classList.add('open');
        burstConfetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
        setTimeout(() => {
            welcomeOverlay.classList.add('hidden');
            document.body.style.overflow = '';
            spawnBalloonWave(8);
            showWishModal(
                'Welcome, Sujeena! 🎉',
                'Your birthday universe is ready — pop balloons, blow candles, and explore every surprise we made for you!'
            );
        }, 900);
    }

    if (welcomeOverlay) {
        document.body.style.overflow = 'hidden';
        openGiftBtn?.addEventListener('click', openWelcomeSurprise);
        giftBox?.addEventListener('click', openWelcomeSurprise);
    }

    // ─── Typed birthday wish ───
    const typedEl = document.getElementById('typed-wish');
    const wishes = [
        'Wishing you a year filled with joy, success, and beautiful moments. You are amazing! ✨',
        'May every dream you chase bloom like sunflowers in summer. 🌻',
        'You deserve all the happiness, cake, and confetti in the world today! 🎂'
    ];
    let wishIndex = 0;

    function typeText(text, el, speed = 35) {
        if (!el) return;
        el.classList.remove('typing-done');
        el.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            el.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                el.classList.add('typing-done');
                setTimeout(() => {
                    wishIndex = (wishIndex + 1) % wishes.length;
                    typeText(wishes[wishIndex], el);
                }, 4000);
            }
        }, speed);
    }
    if (typedEl) typeText(wishes[0], typedEl);

    // ─── Balloons ───
    const balloonField = document.getElementById('balloon-field');

    function createBalloon(xPercent) {
        if (!balloonField) return null;
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
        balloon.style.background = `radial-gradient(circle at 35% 30%, ${color}ee, ${color})`;
        balloon.style.left = xPercent != null ? `${xPercent}%` : `${5 + Math.random() * 90}%`;
        balloon.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
        const duration = 12 + Math.random() * 10;
        balloon.style.animationDuration = `${duration}s`;
        balloon.setAttribute('role', 'button');
        balloon.setAttribute('aria-label', 'Pop balloon');

        balloon.addEventListener('click', () => popBalloon(balloon));
        balloon.addEventListener('animationend', () => {
            if (!balloon.classList.contains('popped')) balloon.remove();
        });

        balloonField.appendChild(balloon);
        return balloon;
    }

    function popBalloon(balloon) {
        if (balloon.classList.contains('popped')) return;
        const rect = balloon.getBoundingClientRect();
        balloon.classList.add('popped');
        spawnPopParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, balloon.style.background);
        miniConfetti(rect.left / window.innerWidth, rect.top / window.innerHeight);
        setTimeout(() => balloon.remove(), 400);
    }

    function spawnPopParticles(x, y, colorHint) {
        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.className = 'pop-particle';
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            p.style.background = colorHint?.includes('gradient') ? CONFETTI_COLORS[i % CONFETTI_COLORS.length] : (colorHint || '#ffc300');
            const angle = (Math.PI * 2 * i) / 12;
            const dist = 40 + Math.random() * 50;
            p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 700);
        }
    }

    function spawnBalloonWave(count = 5) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => createBalloon(10 + (i / count) * 80), i * 200);
        }
    }

    setInterval(() => {
        if (document.hidden) return;
        if (balloonField && balloonField.children.length < 12) createBalloon();
    }, 3500);
    setTimeout(() => spawnBalloonWave(6), 1500);

    // ─── Confetti helpers ───
    function burstConfetti(opts = {}) {
        if (typeof confetti !== 'function') return;
        confetti(Object.assign({
            particleCount: 120,
            spread: 70,
            colors: CONFETTI_COLORS,
            origin: { y: 0.6 }
        }, opts));
    }

    function miniConfetti(x, y) {
        burstConfetti({ particleCount: 40, spread: 50, origin: { x, y } });
    }

    function megaSurprise() {
        const duration = 2500;
        const end = Date.now() + duration;
        const frame = () => {
            burstConfetti({
                particleCount: 8,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 }
            });
            burstConfetti({
                particleCount: 8,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 }
            });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
        spawnBalloonWave(10);
        showWishModal(
            'Surprise! 🎈',
            'You are loved beyond measure. Have the most magical birthday ever, Sujeena!'
        );
    }

    document.getElementById('surpriseFab')?.addEventListener('click', megaSurprise);

    // ─── Wish reveal modal ───
    function showWishModal(title, body) {
        const titleEl = document.getElementById('wishRevealTitle');
        const bodyEl = document.getElementById('wishRevealBody');
        const modalEl = document.getElementById('wishRevealModal');
        if (!modalEl || !titleEl || !bodyEl) return;
        titleEl.textContent = title;
        bodyEl.textContent = body;
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }

    // ─── Interactive cake & candles ───
    const cakeCandles = document.querySelectorAll('#cakeCandles .candle');
    const blowAllBtn = document.getElementById('blowAllCandles');
    const cakeWishText = document.getElementById('cakeWishText');
    const mainCake = document.getElementById('mainCake');
    let blownCount = 0;
    const wishMessages = [
        '✨ Light is shining on you today ✨',
        '🌟 One candle down — wishes loading...',
        '💛 Halfway there — keep dreaming big!',
        '🎈 Almost ready to make your wish...',
        '🎂 Make a wish, Sujeena! Close your eyes...'
    ];

    function updateCakeUI() {
        if (cakeWishText) cakeWishText.textContent = wishMessages[Math.min(blownCount, wishMessages.length - 1)];
        if (blowAllBtn) blowAllBtn.disabled = blownCount >= cakeCandles.length;
    }

    function blowCandle(candle) {
        if (candle.classList.contains('blown')) return;
        candle.classList.add('blown');
        blownCount++;
        updateCakeUI();
        miniConfetti(0.5, 0.5);

        if (blownCount === cakeCandles.length) {
            celebrateAllCandlesOut();
        }
    }

    function celebrateAllCandlesOut() {
        mainCake?.classList.add('cake-celebrate');
        setTimeout(() => mainCake?.classList.remove('cake-celebrate'), 600);
        burstConfetti({ particleCount: 250, spread: 120, origin: { y: 0.55 } });
        spawnBalloonWave(6);
        showWishModal(
            'Your wish is on its way! 🌟',
            'May this year bring you adventures, laughter, and everything your heart desires. Happy Birthday, Sujeena!'
        );
        if (cakeWishText) cakeWishText.textContent = '🎉 Wish granted! Happy Birthday! 🎉';
    }

    cakeCandles.forEach(candle => {
        candle.addEventListener('click', () => blowCandle(candle));
    });

    blowAllBtn?.addEventListener('click', () => {
        cakeCandles.forEach(c => blowCandle(c));
    });

    // ─── Konami code easter egg ───
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    document.addEventListener('keydown', (e) => {
        if (e.key === konami[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konami.length) {
                konamiIndex = 0;
                megaSurprise();
                showWishModal('Secret unlocked! 🎮', 'You found the hidden birthday cheat code. Extra confetti, just for you!');
            }
        } else {
            konamiIndex = 0;
        }
    });

    // ─── Scroll reveal ───
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    revealElements.forEach(el => revealObserver.observe(el));

    // ─── Navbar scroll ───
    const navbar = document.querySelector('.custom-navbar');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }

        let current = '';
        sections.forEach(section => {
            if (scrollY >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href')?.includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // ─── Opening confetti burst ───
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 100, zIndex: 9999, colors: CONFETTI_COLORS };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const confettiInterval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(confettiInterval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);

    document.querySelectorAll('.btn-custom').forEach(btn => {
        btn.addEventListener('click', () => {
            burstConfetti({ particleCount: 80, spread: 60, origin: { y: 0.65 } });
        });
    });

    // ─── 3D tilt on glass panels ───
    document.querySelectorAll('.glass-panel').forEach(panel => {
        panel.addEventListener('mousemove', e => {
            const rect = panel.getBoundingClientRect();
            const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -5;
            const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 5;
            panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        panel.addEventListener('mouseleave', () => {
            panel.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });

    // Wall of Love handled in wall-of-love.js

    // ─── Gallery ───
    async function loadGallery() {
        const galleryContainer = document.getElementById('gallery-container');
        if (!galleryContainer) return;
        try {
            const response = await fetch('/api/gallery');
            const result = await response.json();
            if (response.ok && result.data?.length > 0) {
                galleryContainer.innerHTML = '<div class="gallery-masonry w-100"></div>';
                const masonry = galleryContainer.querySelector('.gallery-masonry');
                result.data.forEach(imgUrl => {
                    masonry.insertAdjacentHTML('beforeend', `
                        <div class="gallery-item reveal-up">
                            <img src="${imgUrl}" alt="Gallery Photo" class="clickable-gallery" style="cursor:zoom-in">
                        </div>
                    `);
                });
                masonry.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
        }
    }
    loadGallery();

    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('clickable-gallery')) return;
        document.getElementById('fullViewImage').src = e.target.src;
        document.getElementById('fullViewName').textContent = 'Birthday Memories';
        const badge = document.getElementById('fullViewBadge');
        badge.className = 'badge bg-primary rounded-pill fw-normal';
        badge.textContent = 'Gallery';
        new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    });
});
