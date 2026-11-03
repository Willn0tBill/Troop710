(function () {
  "use strict";

  const menuButton = document.querySelector(".menu-button");
  const menu = document.querySelector(".nav");

  if (menuButton && menu) {
    function setMenu(open) {
      menu.setAttribute("data-open", String(open));
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      menuButton.textContent = open ? "×" : "☰";
    }

    menuButton.addEventListener("click", () => {
      setMenu(menu.getAttribute("data-open") !== "true");
    });

    menu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && menu.getAttribute("data-open") === "true") {
        setMenu(false);
        menuButton.focus();
      }
    });

    document.addEventListener("click", event => {
      if (menu.getAttribute("data-open") === "true" && !event.target.closest(".site-header")) {
        setMenu(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1020 && menu.getAttribute("data-open") === "true") {
        setMenu(false);
      }
    });
  }

  const search = document.getElementById("doc-search");
  const groups = [...document.querySelectorAll(".doc-group")];

  if (search && groups.length) {
    const resultCount = document.getElementById("doc-count");
    const emptyMessage = document.getElementById("no-results");
    const initialExpanded = groups.map(group => group.open);
    const total = groups.reduce((sum, group) => sum + group.querySelectorAll(".doc-item").length, 0);

    function filterDocuments() {
      const query = search.value.trim().toLocaleLowerCase();
      let visible = 0;

      groups.forEach((group, index) => {
        const title = group.querySelector("summary")?.textContent.toLocaleLowerCase() || "";
        let groupVisible = 0;

        group.querySelectorAll(".doc-item").forEach(item => {
          const matched = !query || title.includes(query) || item.textContent.toLocaleLowerCase().includes(query);
          item.hidden = !matched;
          if (matched) groupVisible += 1;
        });

        group.hidden = groupVisible === 0;
        if (query && groupVisible) group.open = true;
        else if (!query) group.open = initialExpanded[index];

        visible += groupVisible;
      });

      if (resultCount) resultCount.textContent = (query ? visible : total) + " public documents";
      if (emptyMessage) emptyMessage.style.display = query && visible === 0 ? "block" : "none";
    }

    search.addEventListener("input", filterDocuments);
    filterDocuments();
  }

  // Motion enhancements are progressive: without this feature, all content
  // remains visible and the original site continues working.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = [...document.querySelectorAll("[data-reveal]")];

  if (!reducedMotion.matches && "IntersectionObserver" in window && revealTargets.length) {
    // Delay by visual position within each grid, not by total page position.
    // That keeps large leader rosters from having excessive stagger times.
    const gridSelector = ".home-values, .home-directory__grid, .people-grid, .resource-grid, .grid-3, .grid-4";
    revealTargets.forEach(target => {
      const grid = target.parentElement.closest(gridSelector);
      if (grid) {
        const siblings = [...target.parentElement.children].filter(child => child.hasAttribute("data-reveal"));
        const index = siblings.indexOf(target);
        if (index >= 0) {
          target.style.setProperty("--reveal-delay", Math.min(index % 4, 3) * 85 + "ms");
        }
      }
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: "0px 0px -35px 0px",
      threshold: 0.08
    });

    document.documentElement.classList.add("motion-ready");
    revealTargets.forEach(target => observer.observe(target));

    // If a user changes accessibility settings while the page is open,
    // immediately disclose everything rather than preserving hidden content.
    reducedMotion.addEventListener?.("change", event => {
      if (event.matches) {
        document.documentElement.classList.remove("motion-ready");
        revealTargets.forEach(target => target.classList.add("is-visible"));
        observer.disconnect();
      }
    });
  }

  // A slim scroll progress indicator provides orientation on long pages.
  // The requestAnimationFrame throttle avoids expensive per-scroll changes.
  const siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    let framePending = false;
    const updateProgress = () => {
      framePending = false;
      const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const percent = remaining ? Math.min(100, Math.max(0, window.scrollY / remaining * 100)) : 0;
      siteHeader.style.setProperty("--scroll-progress", percent.toFixed(2) + "%");
    };
    const scheduleProgress = () => {
      if (!framePending) {
        framePending = true;
        window.requestAnimationFrame(updateProgress);
      }
    };
    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress, { passive: true });
    scheduleProgress();
  }

}());