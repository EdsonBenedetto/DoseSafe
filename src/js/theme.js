(() => {
  const STORAGE_KEY = "ds_theme";
  const root = document.documentElement;

  function readTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // O tema segue aplicado nesta página mesmo se o navegador bloquear o armazenamento.
    }
    updateButton(theme);
  }

  function updateButton(theme) {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;

    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Ativar tema claro" : "Ativar tema escuro");
    button.title = dark ? "Ativar tema claro" : "Ativar tema escuro";
    button.querySelector(".theme-toggle__label").textContent = dark ? "Tema claro" : "Tema escuro";
    button.querySelector(".theme-toggle__icon").innerHTML = dark
      ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>'
      : '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"></path>';
  }

  function mountButton() {
    if (document.querySelector("[data-theme-toggle]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.dataset.themeToggle = "";
    button.innerHTML = '<svg class="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true"></svg><span class="theme-toggle__label"></span>';
    button.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });

    const header = document.querySelector("header");
    if (header) {
      header.append(button);
    } else {
      button.classList.add("theme-toggle--floating");
      document.body.append(button);
    }

    updateButton(root.dataset.theme || "light");
  }

  const initialTheme = readTheme();
  root.dataset.theme = initialTheme;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton, { once: true });
  } else {
    mountButton();
  }
})();
