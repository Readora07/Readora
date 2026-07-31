(function() {
    const SHEET_URL = window.ReadoraConfig ? ReadoraConfig.googleAppsScript.sheetUrl : 'https://script.google.com/macros/s/AKfycbyqYCTbrIA0c8c-YxvlvNsaVrvURkui1dm4YAD3av3OiuwKx6r_4N7AhnhLiIwwRych/exec';
    const CACHE_KEY = window.ReadoraConfig ? ReadoraConfig.storage.books : 'readoraBooks';
    const VERSION_KEY = window.ReadoraConfig ? ReadoraConfig.storage.booksVersion : 'readoraBooksVersion';

    function normalizeTextField(value) {
        return typeof value === 'string'
            ? value.normalize('NFKC')
                .replace(/\u09A1\u09BC/g, '\u09DC')
                .replace(/\u09A2\u09BC/g, '\u09DD')
                .replace(/\u09AF\u09BC/g, '\u09DF')
                .replace(/\s+/g, ' ')
                .trim()
            : value;
    }

    function processBooks(rawData) {
        const list = Array.isArray(rawData) ? rawData : (rawData && rawData.books ? rawData.books : []);
        return list.map((book, index) => {
            let uniqueId = book.id || book.ID || book['Book ID'];
            if (!uniqueId) {
                const titlePart = (book.title || book.Title || 'book').toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
                const authorPart = (book.author || book.Author || 'unknown').toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
                uniqueId = `${titlePart}-${authorPart}-${index}`;
            }
            return {
                ...book,
                id: uniqueId.toString(),
                title: normalizeTextField(book.title || book.Title),
                author: normalizeTextField(book.author || book.Author),
                publication: normalizeTextField(book.publication || book.Publication || book.publisher || book.Publisher),
                category: normalizeTextField(book.category || book.Category),
                language: normalizeTextField(book.language || book.Language),
                status: normalizeTextField(book.status || book.Status || book['Book Status'] || book['book status']),
                description: normalizeTextField(book.description || book.Description),
                frontImg: book.frontImg || book['Front Img'] || book.img
            };
        });
    }

    function getCachedBooks() {
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            const version = localStorage.getItem(VERSION_KEY);
            const hasValidIds = cached && cached.length > 0 && cached.every(b => b.id && String(b.id).length > 5);
            if (cached && hasValidIds && (version === '2' || version === '3' || version === '4')) {
                const processed = processBooks(cached);
                if (version !== '4') saveBooks(processed);
                return processed;
            }
        } catch (e) {
            console.warn('ReadoraBooksLoader: cache read failed', e);
        }
        return [];
    }

    async function getCachedBooksAsync() {
        if (window.ReadoraStorage) {
            try {
                const cached = await ReadoraStorage.get(CACHE_KEY);
                const version = await ReadoraStorage.get(VERSION_KEY);
                const hasValidIds = Array.isArray(cached) && cached.length > 0 && cached.every(b => b.id && String(b.id).length > 0);
                if (cached && hasValidIds && version === '5') {
                    return processBooks(cached);
                }
            } catch (e) {
                console.warn('ReadoraBooksLoader: IndexedDB cache read failed', e);
            }
        }

        return new Promise((resolve) => {
            setTimeout(() => resolve(getCachedBooks()), 0);
        });
    }

    async function saveBooks(books) {
        if (window.ReadoraStorage) {
            try {
                await ReadoraStorage.set(CACHE_KEY, books);
                await ReadoraStorage.set(VERSION_KEY, '5');
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem(VERSION_KEY);
                return;
            } catch (e) {
                console.warn('ReadoraBooksLoader: IndexedDB cache write failed', e);
            }
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(books));
        localStorage.setItem(VERSION_KEY, '4');
    }

    async function fetchFreshBooks() {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data && data.error) throw new Error(data.error);
        const processed = processBooks(data);
        await saveBooks(processed);
        return processed;
    }

    /**
     * Loads books: returns cache immediately, then fetches fresh data in background.
     * @param {{ onBooks?: (books: object[]) => void }} options
     * @returns {Promise<object[]>}
     */
    async function loadBooks(options) {
        const onBooks = options && typeof options.onBooks === 'function' ? options.onBooks : null;
        const cached = await getCachedBooksAsync();
        if (cached.length && onBooks) onBooks(cached);

        try {
            const fresh = await fetchFreshBooks();
            if (onBooks) onBooks(fresh);
            return fresh;
        } catch (error) {
            console.error('ReadoraBooksLoader: fetch failed', error);
            return cached;
        }
    }

    window.ReadoraBooksLoader = {
        SHEET_URL,
        getCachedBooks,
        getCachedBooksAsync,
        fetchFreshBooks,
        loadBooks,
        processBooks,
        saveBooks
    };
})();
