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
}());