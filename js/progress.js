/* ══════════════════════════════════════
   PROGRESS.JS — Progress Tracking
   ══════════════════════════════════════ */

export class ProgressManager {
    constructor() {
        this.storageKey = 'codelearn-progress';
        this.historyKey = 'codelearn-history';
        this.bookmarksKey = 'codelearn-bookmarks';
        this.data = this.load();
        this.history = this.loadHistory();
        this.bookmarks = this.loadBookmarks();
    }

    // ── Completion ──
    load() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch {
            return {};
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    isCompleted(categoryId, lessonId) {
        return this.data[`${categoryId}/${lessonId}`] === true;
    }

    toggleComplete(categoryId, lessonId) {
        const key = `${categoryId}/${lessonId}`;
        this.data[key] = !this.data[key];
        if (!this.data[key]) delete this.data[key];
        this.save();
        return this.data[key] || false;
    }

    getCompletedCount() {
        return Object.values(this.data).filter(v => v === true).length;
    }

    getCategoryProgress(categoryId, totalLessons) {
        let completed = 0;
        for (const key in this.data) {
            if (key.startsWith(categoryId + '/') && this.data[key]) {
                completed++;
            }
        }
        return totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    }

    getGlobalProgress(totalLessons) {
        const completed = this.getCompletedCount();
        return totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    }

    // ── History ──
    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.historyKey)) || [];
        } catch {
            return [];
        }
    }

    saveHistory() {
        localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    }

    addToHistory(categoryId, lessonId, title, categoryName) {
        // Remove duplicate
        this.history = this.history.filter(h => !(h.categoryId === categoryId && h.lessonId === lessonId));
        // Add to front
        this.history.unshift({ categoryId, lessonId, title, categoryName, timestamp: Date.now() });
        // Keep max 20
        this.history = this.history.slice(0, 20);
        this.saveHistory();
    }

    getRecent(count = 5) {
        return this.history.slice(0, count);
    }

    // ── Bookmarks ──
    loadBookmarks() {
        try {
            return JSON.parse(localStorage.getItem(this.bookmarksKey)) || [];
        } catch {
            return [];
        }
    }

    saveBookmarks() {
        localStorage.setItem(this.bookmarksKey, JSON.stringify(this.bookmarks));
    }

    isBookmarked(categoryId, lessonId) {
        return this.bookmarks.some(b => b.categoryId === categoryId && b.lessonId === lessonId);
    }

    toggleBookmark(categoryId, lessonId, title, categoryName) {
        const idx = this.bookmarks.findIndex(b => b.categoryId === categoryId && b.lessonId === lessonId);
        if (idx >= 0) {
            this.bookmarks.splice(idx, 1);
        } else {
            this.bookmarks.push({ categoryId, lessonId, title, categoryName });
        }
        this.saveBookmarks();
        return idx < 0; // true if now bookmarked
    }
}