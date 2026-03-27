/* ══════════════════════════════════════
   THEME.JS — Dark/Light Mode
   ══════════════════════════════════════ */

export class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('themeToggle');
        this.icon = document.getElementById('themeIcon');
        this.label = document.getElementById('themeLabel');

        this.init();
        this.bindEvents();
    }

    init() {
        const saved = localStorage.getItem('codelearn-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        this.setTheme(theme, false);
    }

    bindEvents() {
        this.toggle?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark', true);
        });

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('codelearn-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
            }
        });
    }

    setTheme(theme, save = true) {
        document.documentElement.setAttribute('data-theme', theme);

        if (this.icon) {
            this.icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }
        if (this.label) {
            this.label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
        }
        if (save) {
            localStorage.setItem('codelearn-theme', theme);
        }
    }

    getTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
}