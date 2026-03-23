// ── Show nav immediately on desktop; on mobile coordinate with image load ────
if (window.innerWidth > 640) {
    // Desktop: reveal nav right away (no layout shift concern)
    document.body.classList.add("intro-ui-visible");
} else {
    // Mobile: wait for window.load so the first image is decoded and sized,
    // then fade in all above-fold content, then slide in the nav bar shortly after.
    const revealAboveFold = () => {
        document.documentElement.classList.remove("about-loading");
        setTimeout(() => {
            document.body.classList.add("intro-ui-visible");
        }, 350);
    };

    if (document.readyState === "complete") {
        // Already loaded (e.g. bfcache restore)
        revealAboveFold();
    } else {
        window.addEventListener("load", revealAboveFold, { once: true });
    }

    // bfcache guard
    window.addEventListener("pageshow", (e) => {
        if (e.persisted) {
            document.documentElement.classList.remove("about-loading");
            document.body.classList.add("intro-ui-visible");
        }
    });
}

// ── Mobile nav panel ─────────────────────────────────────────────────
(() => {
    const toggle = document.getElementById("menuToggle");
    const panel = document.getElementById("navPanel");
    const closeBtn = document.getElementById("navPanelClose");
    if (!toggle || !panel) return;

    function openMenu() {
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }

    toggle.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
})();

// ── Single DOMContentLoaded — nav exit + scroll-reveal ───────────────
document.addEventListener("DOMContentLoaded", () => {

    // Nav exit sequence — covers both desktop navLinks and mobile panel links
    document.querySelectorAll(".navLinks a, .navPanelLinks a, .brand").forEach(link => {
        link.addEventListener("click", function (e) {
            if (this.target === "_blank") return;
            if (this.origin !== location.origin) return;
            if (this.href === location.href) return;
            e.preventDefault();
            const dest = this.href;

            // 1. Black veil fades in over content (below nav, z-index 998)
            const veil = document.createElement("div");
            veil.style.cssText = "position:fixed;inset:0;z-index:998;background:#000;opacity:0;pointer-events:none;transition:opacity 600ms ease;";
            document.body.appendChild(veil);
            requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = "1"; }));

            // 2. Nav slides up after content is veiled
            setTimeout(() => { document.body.classList.add("is-exiting"); }, 400);

            // 3. Navigate
            setTimeout(() => { window.location.href = dest; }, 950);
        });
    });

    // Scroll-reveal
    const revealEls = document.querySelectorAll(".reveal, .reveal-heavy");
    if (revealEls.length) {
        const revealObs = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => entry.target.classList.add("is-visible"));
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
        revealEls.forEach(el => revealObs.observe(el));
    }

});

// ── Scroll hint hide/show ─────────────────────────────────────────────
(() => {
    const hint = document.querySelector(".scrollHint");
    if (!hint) return;
    let hidden = false;
    window.addEventListener("scroll", () => {
        if (!hidden && window.scrollY > 80) {
            hint.classList.add("is-hidden");
            hidden = true;
        } else if (hidden && window.scrollY <= 80) {
            hint.classList.remove("is-hidden");
            hidden = false;
        }
    }, { passive: true });
})();

// ── Stats block — build into fragment, one DOM write ─────────────────
(() => {
    const flow = document.getElementById("statsFlow");
    if (!flow) return;
    const keys = Array.from({ length: 12 }, (_, i) => `about.statsLine${i + 1}`);
    const fallbacks = [
        "6 years of research along the medieval Silk Road",
        "5 books - 2,613 pages - 1,000 images",
        "42 supporting institutions",
        "2 awards",
        "25 visited cities across 13 countries",
        "5 missions of spatial data capture",
        "10 terabytes of generated data",
        "20 computational experiments",
        "20 video essays",
        "8 augmented reality applications",
        "2 immersive websites",
        "7 interactive platforms"
    ];

    function renderStats() {
        const block = document.createElement("div");
        block.className = "statsBlock left reveal";
        const frag = document.createDocumentFragment();
        keys.forEach((key, index) => {
            const p = document.createElement("div");
            p.className = "sline";
            p.textContent = window.i18n?.get(key) || fallbacks[index];
            frag.appendChild(p);
        });
        block.appendChild(frag);
        flow.innerHTML = "";
        flow.appendChild(block);
    }

    renderStats();
    window.addEventListener("i18n:updated", renderStats);
})();

// ── Footer year ───────────────────────────────────────────────────────
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ── Colophon glyph mutation ───────────────────────────────────────────
(() => {
    const TARGET_SELECTORS = [
        ".book5Poem",
        ".colophonTitle",
        ".colophonSubtitle",
        ".colophonAuthor",
        ".colophonPoem"
    ];
    const CREDIT_SELECTOR = ".poemCredit";

    const MAX_ACTIVE = 5;
    const VISIBLE_MS = 1000;  // was MIN===MAX===1000 — one constant
    const COOLDOWN_MIN = 1000;
    const COOLDOWN_MAX = 2400;
    const SPAWN_MIN = 180;
    const SPAWN_MAX = 500;

    const GLYPHS = [
        "⸜", "⸝", "⸠", "⸡", "⸢", "⸣", "⸤", "⸥", "⸦", "⸧",
        "⸨", "⸩", "⸪", "⸫", "⸬", "⸭", "⸮", "ⸯ", "⸰", "⸱",
        "⸲", "⸳", "⸴", "⸵", "⸶", "⸷", "⸸", "⸹",
        "※", "⁂", "⁑", "⁕", "⁜", "⁘", "⁙", "⁚", "⁛", "⁝",
        "⟆", "⟇", "⟈", "⟉", "⟊", "⟋", "⟌", "⟍", "⟎", "⟏",
        "⟐", "⟑", "⟒", "⟓", "⟔", "⟕", "⟖", "⟗", "⟘", "⟙",
        "⟜", "⟝", "⟞", "⟟", "⟠", "⟡", "⟢", "⟣",
        "⧖", "⧗", "⧘", "⧙", "⧚", "⧛", "⧜", "⧝", "⧞", "⧟",
        "⧠", "⧡", "⧢", "⧣", "⧤", "⧥", "⧦", "⧧", "⧨", "⧩",
        "Ⳁ", "ⳁ", "Ⳃ", "ⳃ", "Ⳅ", "ⳅ", "Ⳇ", "ⳇ", "Ⳉ", "ⳉ",
        "Ⳋ", "ⳋ", "Ⳍ", "ⳍ", "Ⳏ", "ⳏ", "Ⳑ", "ⳑ", "Ⳓ", "ⳓ",
        "꙳", "꙰", "꙱", "꙲", "ꙴ", "ꙵ", "ꙶ", "ꙷ", "ꙸ", "ꙹ",
        "ꙺ", "ꙻ", "꙼", "꙽", "꙾", "ꙿ",
        "∴", "∵", "∷", "∺", "∻", "∽", "≋", "≈",
        "⍜", "⍝", "⍞", "⍟", "⍠", "⍡", "⍢", "⍣", "⍤", "⍥",
        "⍦", "⍧", "⍨", "⍩", "⍪", "⍫", "⍬", "⍭", "⍮", "⍯"
    ];

    const rand = n => Math.floor(Math.random() * n);
    const randRange = (a, b) => a + Math.random() * (b - a);

    function splitTextNodeToLetters(textNode) {
        const frag = document.createDocumentFragment();
        for (const ch of textNode.nodeValue) {
            if (/[A-Za-z]/.test(ch)) {
                const span = document.createElement("span");
                span.className = "poemLetter";
                span.textContent = ch;
                span.dataset.original = ch;
                // removed dataset.mutated — active Set is the single source of truth
                frag.appendChild(span);
            } else {
                frag.appendChild(document.createTextNode(ch));
            }
        }
        textNode.parentNode.replaceChild(frag, textNode);
    }

    function prepareLetters(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
                if (node.parentElement?.closest(CREDIT_SELECTOR)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(splitTextNodeToLetters);
    }

    function start() {
        const containers = TARGET_SELECTORS
            .map(sel => document.querySelector(sel))
            .filter(Boolean);
        if (!containers.length) return;

        containers.forEach(prepareLetters);
        const letters = Array.from(document.querySelectorAll(".poemLetter"));
        if (!letters.length) return;

        const active = new Set();
        const cooldownUntil = new Map();  // index → timestamp; Map<int,int> faster than WeakMap

        // O(n) eligible pool — one Date.now() call per tick, no random probing
        function buildPool(now) {
            const pool = [];
            for (let i = 0; i < letters.length; i++) {
                if (!active.has(letters[i]) && now >= (cooldownUntil.get(i) || 0)) {
                    pool.push(i);
                }
            }
            return pool;
        }

        function mutate(idx) {
            const l = letters[idx];
            active.add(l);
            l.textContent = GLYPHS[rand(GLYPHS.length)];
            l.style.color = "#ffffff";
            setTimeout(() => {
                l.textContent = l.dataset.original;
                l.style.color = "";
                active.delete(l);
                cooldownUntil.set(idx, Date.now() + randRange(COOLDOWN_MIN, COOLDOWN_MAX));
            }, VISIBLE_MS);
        }

        let spawnTimer = null;
        let isVisible = false;

        function spawn() {
            const want = MAX_ACTIVE - active.size;
            if (want > 0) {
                const pool = buildPool(Date.now());
                for (let k = 0; k < want && pool.length > 0; k++) {
                    // Fisher-Yates partial shuffle — pick without replacement
                    const j = rand(pool.length);
                    const idx = pool[j];
                    pool[j] = pool[pool.length - 1];
                    pool.pop();
                    mutate(idx);
                }
            }
            spawnTimer = setTimeout(spawn, randRange(SPAWN_MIN, SPAWN_MAX));
        }

        // Pause spawn loop when footer is off-screen — no wasted timers while user
        // is reading the top of the page
        const footer = document.querySelector("footer");
        if (footer) {
            const visObs = new IntersectionObserver(entries => {
                isVisible = entries[0].isIntersecting;
                if (isVisible && !spawnTimer) {
                    spawnTimer = setTimeout(spawn, 600);
                } else if (!isVisible && spawnTimer) {
                    clearTimeout(spawnTimer);
                    spawnTimer = null;
                }
            }, { threshold: 0.05 });
            visObs.observe(footer);
        } else {
            isVisible = true;
            spawnTimer = setTimeout(spawn, 600);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();

// ── Concept diagram animation ─────────────────────────────────────────
(() => {
    const section = document.getElementById("conceptDiagram");
    if (!section) return;

    function animateDash(el, duration, delayMs) {
        const len = parseFloat(el.getAttribute("stroke-dasharray"));
        el.setAttribute("stroke-dashoffset", len);
        setTimeout(() => {
            el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.5,0,0.2,1)`;
            el.setAttribute("stroke-dashoffset", "0");
        }, delayMs);
    }

    function fadeIn(el, duration, delayMs) {
        if (!el) return;
        setTimeout(() => {
            el.style.transition = `opacity ${duration}ms ease`;
            el.setAttribute("opacity", "1");
        }, delayMs);
    }

    function drawPathReverse(el, duration, delayMs) {
        if (!el) return;
        const len = el.getTotalLength();
        el.setAttribute("stroke-dasharray", len + " " + len);
        el.setAttribute("stroke-dashoffset", -len);
        el.setAttribute("opacity", "1");
        setTimeout(() => {
            el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.25,1)`;
            el.setAttribute("stroke-dashoffset", "0");
        }, delayMs);
    }

    function drawDashedReverse(el, duration, delayMs) {
        if (!el) return;
        const len = el.getTotalLength();
        const period = 8.02;  // dash(4.01) + gap(4.01)
        const total = Math.ceil(len / period) * period;
        el.setAttribute("stroke-dasharray", "4.01 4.01");
        el.setAttribute("stroke-dashoffset", total);
        el.setAttribute("opacity", "1");
        setTimeout(() => {
            el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.25,1)`;
            el.setAttribute("stroke-dashoffset", "0");
        }, delayMs);
    }

    function startAnimation() {
        // Resolve all elements once at animation start — not on every call
        const e = {
            axisY: document.getElementById("axisY"),
            arrowYT: document.getElementById("arrowYT"),
            arrowYB: document.getElementById("arrowYB"),
            axisX: document.getElementById("axisX"),
            arrowXR: document.getElementById("arrowXR"),
            arrowXL: document.getElementById("arrowXL"),
            lblTech: document.getElementById("lblTech"),
            lblMyth: document.getElementById("lblMyth"),
            lblWest: document.getElementById("lblWest"),
            lblEast: document.getElementById("lblEast"),
            spiralStubEnd: document.getElementById("spiralStubEnd"),
            spiralMain: document.getElementById("spiralMain"),
            spiralStubStart: document.getElementById("spiralStubStart"),
            spiralArrow: document.getElementById("spiralArrow"),
        };

        animateDash(e.axisY, 600, 0);
        fadeIn(e.arrowYT, 220, 580);
        fadeIn(e.arrowYB, 220, 580);
        animateDash(e.axisX, 600, 120);
        fadeIn(e.arrowXR, 220, 680);
        fadeIn(e.arrowXL, 220, 680);
        fadeIn(e.lblTech, 350, 700);
        fadeIn(e.lblMyth, 350, 700);
        fadeIn(e.lblWest, 350, 800);
        fadeIn(e.lblEast, 350, 800);
        drawPathReverse(e.spiralStubEnd, 150, 1400);
        drawDashedReverse(e.spiralMain, 2600, 1550);
        drawPathReverse(e.spiralStubStart, 150, 4150);
        fadeIn(e.spiralArrow, 280, 4300);
    }

    let fired = false;
    const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !fired) {
            fired = true;
            obs.disconnect();
            startAnimation();
        }
    }, { threshold: 0.1 });
    obs.observe(section);
})();

// ── Rewrite index.html nav links to skip prelude ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topnav a[href="index.html"], a.brand[href="index.html"]').forEach(a => {
        a.setAttribute('href', 'index.html?skip=1');
    });
});
