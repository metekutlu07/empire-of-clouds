// ── Nav intro: slide down on load ────────────────────────────────────────────
requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add("nav-ready");
}));

// ── Mobile nav panel ─────────────────────────────────────────────────────────
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

document.addEventListener("DOMContentLoaded", () => {

    // ── Header title fade-in ──────────────────────────────────────────────────
    const headerTitle = document.querySelector(".booksHeaderTitle");
    if (headerTitle) setTimeout(() => headerTitle.classList.add("is-visible"), 100);

    // ── Image fade-in once loaded ─────────────────────────────────────────────
    document.querySelectorAll(".coverWrap img").forEach(img => {
        if (img.complete) img.classList.add("loaded");
        else img.onload = () => img.classList.add("loaded");
    });

    // ── Scroll hint arrow — hide once user scrolls ───────────────────────────
    const scrollHint = document.getElementById("scrollHint");
    if (scrollHint) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 60) scrollHint.classList.add("is-hidden");
        }, { passive: true });
    }

    // ── Staggered scroll reveal ───────────────────────────────────────────────
    const cards = document.querySelectorAll(".bookCard");
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.06 });

    cards.forEach((card, i) => {
        card.style.transitionDelay = `${i * 90}ms`;
        io.observe(card);
    });

    // ── Smooth page exit — nav slides up + black veil ─────────────────────────
    document.querySelectorAll(".navLinks a, .navPanelLinks a, .brand, .bookCard").forEach(link => {
        link.addEventListener("click", function (e) {
            if (this.target === "_blank") return;
            if (this.origin !== location.origin) return;
            if (this.href === location.href) return;

            e.preventDefault();
            const dest = this.href;

            // Suppress the mobile nav panel unconditionally — it may be
            // transitioning-closed (not yet fully hidden) when a card is tapped.
            const navPanel = document.getElementById("navPanel");
            if (navPanel) {
                navPanel.style.transition = "none";
                navPanel.style.opacity = "0";
                navPanel.style.pointerEvents = "none";
                navPanel.classList.remove("is-open");
                document.body.style.overflow = "";
            }

            document.body.classList.add("is-exiting");

            const veil = document.createElement("div");
            veil.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;opacity:0;pointer-events:none;transition:opacity 500ms ease;";
            document.body.appendChild(veil);
            requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = "1"; }));

            setTimeout(() => { window.location.href = dest; }, 600);
        });
    });

});

// ── Rewrite index.html nav links to skip prelude ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.topnav a[href="index.html"], a.brand[href="index.html"]').forEach(a => {
        a.setAttribute('href', 'index.html?skip=1');
    });
});