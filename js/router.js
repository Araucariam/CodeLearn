/* ══════════════════════════════════════
   ROUTER.JS — Simple Hash Router
   ══════════════════════════════════════ */

export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        window.addEventListener('hashchange', () => this.resolve());
    }

    on(path, callback) {
        this.routes[path] = callback;
        return this;
    }

    resolve() {
        const hash = window.location.hash.slice(1) || '/';
        this.currentRoute = hash;

        // Try exact match
        if (this.routes[hash]) {
            this.routes[hash](hash);
            return;
        }

        // Try pattern match: /category/lesson
        for (const [pattern, callback] of Object.entries(this.routes)) {
            if (pattern === '*') continue;
            const regex = new RegExp('^' + pattern.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
            const match = hash.match(regex);
            if (match) {
                callback(...match.slice(1));
                return;
            }
        }

        // Fallback
        if (this.routes['*']) {
            this.routes['*'](hash);
        }
    }

    navigate(path) {
        window.location.hash = path;
    }

    getCurrentRoute() {
        return this.currentRoute || '/';
    }
}