/* ══════════════════════════════════════
   SEARCH.JS — Search Functionality
   ══════════════════════════════════════ */

export class SearchManager {
    constructor(categories, onSelect) {
        this.categories = categories;
        this.onSelect = onSelect;
        this.modal = document.getElementById('searchModal');
        this.modalInput = document.getElementById('searchModalInput');
        this.modalResults = document.getElementById('searchModalResults');
        this.sidebarInput = document.getElementById('searchInput');
        this.focusedIndex = -1;

        this.allLessons = this.buildIndex();
        this.bindEvents();
    }

    buildIndex() {
        const lessons = [];
        this.categories.forEach(cat => {
            cat.lessons.forEach(lesson => {
                lessons.push({
                    categoryId: cat.id,
                    categoryName: cat.name,
                    categoryIcon: cat.icon,
                    lessonId: lesson.id,
                    title: lesson.title,
                    description: lesson.description || '',
                    searchText: `${cat.name} ${lesson.title} ${lesson.description || ''}`.toLowerCase()
                });
            });
        });
        return lessons;
    }

    bindEvents() {
        // Ctrl+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openModal();
            }
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Modal input
        this.modalInput?.addEventListener('input', (e) => {
            this.search(e.target.value);
        });

        // Modal backdrop click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Keyboard navigation in modal
        this.modalInput?.addEventListener('keydown', (e) => {
            const items = this.modalResults.querySelectorAll('.search-result-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.focusedIndex = Math.min(this.focusedIndex + 1, items.length - 1);
                this.updateFocus(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
                this.updateFocus(items);
            } else if (e.key === 'Enter' && this.focusedIndex >= 0) {
                items[this.focusedIndex]?.click();
            }
        });

        // Sidebar search
        this.sidebarInput?.addEventListener('click', () => {
            this.openModal();
        });
    }

    updateFocus(items) {
        items.forEach((item, i) => {
            item.classList.toggle('focused', i === this.focusedIndex);
        });
        items[this.focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    openModal() {
        this.modal.classList.add('active');
        this.modalInput.value = '';
        this.modalInput.focus();
        this.focusedIndex = -1;
        this.search('');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.modalInput.value = '';
        this.modalResults.innerHTML = '';
    }

    isModalOpen() {
        return this.modal.classList.contains('active');
    }

    search(query) {
        const q = query.toLowerCase().trim();
        this.focusedIndex = -1;

        if (!q) {
            this.modalResults.innerHTML = `
                <div class="search-no-results">
                    <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search</span>
                    Tapez pour rechercher dans les cours...
                </div>
            `;
            return;
        }

        const results = this.allLessons.filter(l => l.searchText.includes(q));

        if (results.length === 0) {
            this.modalResults.innerHTML = `
                <div class="search-no-results">
                    <span class="material-symbols-outlined" style="font-size:32px;display:block;margin-bottom:8px;">search_off</span>
                    Aucun résultat pour « ${query} »
                </div>
            `;
            return;
        }

        this.modalResults.innerHTML = results.slice(0, 20).map(r => `
            <div class="search-result-item" 
                 data-category="${r.categoryId}" 
                 data-lesson="${r.lessonId}">
                <span class="material-symbols-outlined">${r.categoryIcon}</span>
                <div>
                    <div class="search-result-cat">${r.categoryName}</div>
                    <div class="search-result-title">${this.highlight(r.title, q)}</div>
                </div>
            </div>
        `).join('');

        // Click handlers
        this.modalResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const catId = item.dataset.category;
                const lessonId = item.dataset.lesson;
                this.closeModal();
                this.onSelect(catId, lessonId);
            });
        });
    }

    highlight(text, query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
}