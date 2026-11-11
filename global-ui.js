(function() {
    const PAGE_SIZE = 8;
    const MOBILE_BREAKPOINT = 768;

    function ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function isMobileNav() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function openCartModal() {
        window.location.href = 'payment.html';
    }

    function normalizeUnifiedText(value) {
        return String(value || '')
            .normalize('NFKC')
            .replace(/\u09A1\u09BC/g, '\u09DC')
            .replace(/\u09A2\u09BC/g, '\u09DD')
            .replace(/\u09AF\u09BC/g, '\u09DF')
            .replace(/\s+/g, ' ')
            .trim()
            .toLocaleLowerCase('bn-IN');
    }

    function compactUnifiedText(value) {
        return normalizeUnifiedText(value).replace(/\s+/g, '');
    }

    function bookUnifiedKey(book) {
        if (!book || typeof book !== 'object') return '';
        return [
            compactUnifiedText(book.title),
            compactUnifiedText(book.author),
            compactUnifiedText(book.publication)
        ].join('|');
    }

    function dedupeBooksByUnifiedName(items) {
        if (!Array.isArray(items)) return [];
        const seen = new Set();
        return items.filter(item => {
            const key = bookUnifiedKey(item);
            if (!key || key === '||') return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function initMobileDropdowns() {
        const mainNav = document.getElementById('main-nav');
        if (!mainNav || mainNav.dataset.dropdownReady === 'true') return;
        mainNav.dataset.dropdownReady = 'true';

        mainNav.querySelectorAll('.dropdown > a').forEach(link => {
            link.addEventListener('click', function(event) {
                if (!isMobileNav()) return;

                event.preventDefault();
                event.stopPropagation();

                const dropdown = this.parentElement;
                const willOpen = !dropdown.classList.contains('open');
                mainNav.querySelectorAll('.dropdown').forEach(item => {
                    if (item !== dropdown) item.classList.remove('open');
                });
                dropdown.classList.toggle('open', willOpen);
            }, true);
        });
    }

    function initScrollNavigation() {
        const mainNav = document.getElementById('main-nav');
        if (!mainNav || mainNav.dataset.scrollSpyReady === 'true') return;
        mainNav.dataset.scrollSpyReady = 'true';

        const links = [...mainNav.querySelectorAll('a[href]')];
        const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const normalizePath = path => (path.split('/').pop() || 'index.html').toLowerCase();
        const clearActive = () => mainNav.querySelectorAll('a.active').forEach(link => link.classList.remove('active'));
        clearActive();
        if (currentFile === 'payment.html') return;
        const activate = link => {
            clearActive();
            if (!link) return;
            link.classList.add('active');
            const dropdown = link.closest('.dropdown');
            const parentLink = dropdown && dropdown.querySelector(':scope > a');
            if (parentLink) parentLink.classList.add('active');
        };

        const pageLink = links.find(link => {
            try { return normalizePath(new URL(link.href, window.location.href).pathname) === currentFile && !new URL(link.href, window.location.href).hash; }
            catch (_) { return false; }
        });
        if (pageLink) activate(pageLink);

        const sectionNames = ['home', 'search', 'categories', 'footer'];
        const sections = currentFile === 'index.html'
            ? sectionNames.map(id => document.getElementById(id)).filter(Boolean)
            : [];
        const sectionLinks = new Map();
        links.forEach(link => {
            try {
                const url = new URL(link.href, window.location.href);
                const id = decodeURIComponent(url.hash.slice(1));
                if (normalizePath(url.pathname) === currentFile && id && document.getElementById(id)) sectionLinks.set(id, link);
            } catch (_) {}
        });

        const updateActiveSection = () => {
            if (!sections.length) return;
            const threshold = Math.min(190, Math.max(100, (document.querySelector('header')?.offsetHeight || 80) + 24));
            let currentSection = sections[0];
            sections.forEach(section => { if (section.getBoundingClientRect().top <= threshold) currentSection = section; });
            const matchingLink = sectionLinks.get(currentSection.id);
            if (matchingLink) activate(matchingLink);
        };

        if (sections.length) {
            updateActiveSection();
            let scheduled = false;
            window.addEventListener('scroll', () => {
                if (scheduled) return;
                scheduled = true;
                window.requestAnimationFrame(() => { scheduled = false; updateActiveSection(); });
            }, { passive: true });
            window.addEventListener('resize', updateActiveSection, { passive: true });
            window.addEventListener('hashchange', updateActiveSection);
        }
    }
    function initHeader() {
        if (!document.getElementById('readora-global-ui-style')) {
            const style = document.createElement('style');
            style.id = 'readora-global-ui-style';
            style.textContent = `

                .readora-floating-cart {
                    position: fixed; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); z-index: 1200;
                    transform: translateX(-50%); display: none; align-items: center; justify-content: center;
                    gap: 12px; min-width: 190px; padding: 10px 18px;
                    border: 0; border-radius: 12px; background: linear-gradient(135deg, #166088, #4fc3a1); color: #fff; cursor: pointer;
                    box-shadow: 0 6px 22px rgba(22,96,136,.3); font: 600 15px/1.2 Montserrat, sans-serif; text-align: left; text-decoration: none;
                }
                .readora-floating-cart.visible { display: flex; }
                .readora-floating-cart.just-added { animation: readora-cart-pop .38s ease-out; }
                @keyframes readora-cart-pop { 0% { transform: translate(-50%, 10px) scale(.94); } 65% { transform: translate(-50%, -4px) scale(1.03); } 100% { transform: translate(-50%, 0) scale(1); } }
                .readora-floating-cart .floating-cart-count { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; border-radius: 50%; background: rgba(255,255,255,.2); }
                .readora-floating-cart .floating-cart-label { display: flex; flex-direction: column; gap: 3px; }
                .readora-floating-cart .floating-cart-subtitle { font-size: 12px; font-weight: 400; opacity: .9; }
                @media (max-width: 600px) {
                    .readora-floating-cart { left: 50%; right: auto; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: auto; min-width: 0; max-width: calc(100vw - 32px); gap: 8px; padding: 7px 12px; border-radius: 10px; }
                    .readora-floating-cart .floating-cart-count { width: 26px; height: 26px; flex-basis: 26px; font-size: 12px; }
                    .readora-floating-cart .floating-cart-label { gap: 2px; }
                    .readora-floating-cart .floating-cart-title { font-size: 13px; }
                    .readora-floating-cart .floating-cart-subtitle { font-size: 10px; }
                    .readora-floating-cart > .fa-arrow-right { font-size: 12px; }
                    @keyframes readora-cart-pop { 0% { transform: translate(-50%, 8px) scale(.96); } 65% { transform: translate(-50%, -2px) scale(1.02); } 100% { transform: translate(-50%, 0) scale(1); } }
                }
                footer .social-link, footer .social-link:hover, footer .social-link:focus { text-decoration: none !important; }
                .book-img img { object-fit: cover !important; object-position: center; }
                .book-details-img img { object-fit: contain !important; }
                #cart-icon { display: inline-flex; align-items: center; color: inherit; text-decoration: none; }
                .book-card:not(.related-book-card) .book-img { width: 160px !important; min-width: 160px !important; height: 220px !important; }
                .book-meta-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 0 0 8px; }
                .book-meta-badges .book-meta-badge:not(:first-child) { display: none !important; }
                .book-meta-badge { display: inline-flex; align-items: center; padding: 3px 7px; border-radius: 999px; background: #e8f6f1; color: #28775c; font-size: 10px; font-weight: 700; line-height: 1.35; }
                .book-meta-badge.condition-old { background: #fff1e8; color: #a34c18; }
                button, .btn-add-cart, .btn-add-cart-icon { transition: transform .16s ease, filter .16s ease; }
                button:active, .btn-add-cart:active, .btn-add-cart-icon:active { transform: scale(.96); filter: brightness(.94); }
                .search-filter-btn.active { background: #4fc3a1 !important; color: #fff !important; border-color: #3a9378 !important; box-shadow: 0 0 0 3px rgba(79,195,161,.2); }
                .loader .inner, .loader ul li { animation-play-state: running !important; }
                .loader { --duration: 7.4s; }
                footer .social-link.whatsapp { display: none !important; }
                .search-filter-options { border: 0 !important; box-shadow: none !important; }
                .book-card:not(.related-book-card) {
                    gap: 10px;
                    align-items: stretch !important;
                    min-height: 180px;
                    height: auto;
                }
                .book-card:not(.related-book-card) .book-info {
                    flex: 0 0 clamp(220px, 18vw, 300px) !important;
                    width: clamp(220px, 18vw, 300px) !important;
                    min-width: 220px !important;
                    max-width: 300px;
                    height: auto !important;
                    min-height: 180px;
                    overflow: hidden;
                    justify-content: flex-start !important;
                }
                .book-card:not(.related-book-card) .book-title,
                .book-card:not(.related-book-card) .book-author {
                    display: block;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .book-card:not(.related-book-card) .book-price {
                    min-width: 0;
                    max-width: 100%;
                    margin-bottom: 8px;
                }
                .book-card:not(.related-book-card) .current-price,
                .book-card:not(.related-book-card) .original-price,
                .book-card:not(.related-book-card) .discount {
                    flex: 0 1 auto;
                }
                .book-card:not(.related-book-card) .book-description-wrapper {
                    flex: 1 1 0 !important;
                    min-width: 0 !important;
                    margin-left: 0 !important;
                    padding-left: 6px !important;
                    align-items: flex-start !important;
                    padding-top: 84px;
                }
                .book-card:not(.related-book-card) .book-actions {
                    margin-top: auto;
                }
                .book-card:not(.related-book-card) .btn-add-cart {
                    max-width: 100%;
                    white-space: nowrap;
                }
                .related-book-card {
                    overflow: hidden !important;
                    box-sizing: border-box;
                }
                .related-book-card .book-info,
                .related-book-card .book-details-wrapper {
                    min-width: 0 !important;
                    width: 100% !important;
                    overflow: hidden !important;
                }
                .related-book-card .book-title,
                .related-book-card .book-author {
                    display: -webkit-box !important;
                    -webkit-box-orient: vertical;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: normal !important;
                    word-break: break-word;
                    overflow-wrap: anywhere;
                }
                .related-book-card .book-title {
                    -webkit-line-clamp: 2;
                    line-clamp: 2;
                    max-height: 2.8em;
                }
                .related-book-card .book-author {
                    -webkit-line-clamp: 2;
                    line-clamp: 2;
                    max-height: 2.8em;
                }
                .related-book-card .btn-add-cart {
                    width: 100% !important;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                .book-details-price {
                    display: flex !important;
                    align-items: baseline !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                    gap: 6px 12px !important;
                    text-align: center !important;
                    line-height: 1.25 !important;
                }
                .book-details-price > div {
                    display: flex !important;
                    align-items: baseline !important;
                    justify-content: center !important;
                    flex-wrap: wrap !important;
                    gap: 6px 12px !important;
                    width: 100% !important;
                    margin-bottom: 0 !important;
                }
                .book-details-price > span:first-child,
                .book-details-price > :not(.original-price):not(.discount):first-child {
                    display: inline-block;
                }
                .book-details-price .original-price {
                    display: inline-block !important;
                    margin-left: 0 !important;
                    font-size: 14px !important;
                    color: var(--gray, #777) !important;
                    text-decoration: line-through !important;
                    font-weight: 500 !important;
                }
                .book-details-price .discount {
                    flex: 0 0 100% !important;
                    display: block !important;
                    width: 100% !important;
                    margin-left: 0 !important;
                    color: #B12704 !important;
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    text-align: center !important;
                }
                @media (min-width: 769px) {
                    .modal-header { position: sticky; }
                    .modal-add-icon, .modal-share-icon, .close-modal {
                        top: 16px !important;
                        width: 36px !important;
                        height: 36px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        line-height: 1 !important;
                        margin: 0 !important;
                    }
                    .modal-add-icon { right: 92px !important; }
                    .modal-share-icon { right: 56px !important; }
                    .close-modal { right: 20px !important; font-size: 28px !important; }
                }
                .loader ul li:nth-child(n+19) { display: none; }
                
                @media (max-width: 768px) {
                    nav ul li.dropdown > a { cursor: pointer; }
                    nav ul li.dropdown > a .fa-caret-down { pointer-events: none; }
                    .search-filter-options {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 12px;
                        padding: 0 10px !important;
                    }
                    .search-filter-options[style*="none"] { display: none !important; }
                    .search-filter-btn {
                        width: 100%;
                        min-width: 0;
                        flex: none !important;
                    }
                    .search-filter-btn:nth-child(3) {
                        grid-column: 1 / -1;
                        justify-self: center;
                        width: min(100%, 420px);
                    }
                    
                    /* --- PERFECT MOBILE BOOK CARD FIT --- */
                    .book-card:not(.related-book-card) {
                        align-items: stretch !important;
                        padding: 12px !important;
                        min-height: 140px !important;
                        gap: 15px !important;
                    }
                    .book-card:not(.related-book-card) .book-img {
                        width: 108px !important;
                        min-width: 108px !important;
                        height: 150px !important;
                        min-height: 150px !important;
                        margin-right: 0 !important;
                        flex-shrink: 0 !important;
                    }
                    .book-card:not(.related-book-card) .book-info {
                        flex: 1 1 auto !important;
                        width: auto !important;
                        min-width: 0 !important;
                        max-width: none !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        padding: 0 !important;
                    }
                    .book-card:not(.related-book-card) .book-title {
                        font-size: 15px !important;
                        margin-bottom: 2px !important;
                        white-space: normal !important;
                        display: -webkit-box !important;
                        -webkit-line-clamp: 2 !important;
                        -webkit-box-orient: vertical !important;
                        line-height: 1.3 !important;
                    }
                    .book-card:not(.related-book-card) .book-author {
                        font-size: 12px !important;
                        margin-bottom: 6px !important;
                        white-space: normal !important;
                        display: -webkit-box !important;
                        -webkit-line-clamp: 1 !important;
                        -webkit-box-orient: vertical !important;
                    }
                    .book-card:not(.related-book-card) .book-price {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: baseline !important;
                        flex-wrap: wrap !important;
                        gap: 6px 8px !important;
                        margin-bottom: 4px !important;
                    }
                    .book-card:not(.related-book-card) .current-price {
                        font-size: 18px !important;
                    }
                    .book-card:not(.related-book-card) .original-price {
                        font-size: 12px !important;
                    }
                    .book-card:not(.related-book-card) .discount {
                        width: auto !important;
                        font-size: 12px !important;
                        margin-top: 0 !important;
                        display: inline-block !important;
                    }
                    .book-card:not(.related-book-card) .free-delivery {
                        margin-top: 2px !important;
                        margin-bottom: 8px !important;
                        font-size: 11px !important;
                    }
                    .book-card:not(.related-book-card) .book-actions {
                        margin-top: auto !important;
                        padding-top: 0 !important;
                    }
                    .book-card:not(.related-book-card) .btn-add-cart {
                        width: 100% !important;
                        padding: 8px 12px !important;
                        font-size: 13px !important;
                        min-height: 34px !important;
                    }
                    .book-card:not(.related-book-card) .book-description-wrapper {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const menuToggle = document.getElementById('menu-toggle');
        const mainNav = document.getElementById('main-nav');

        if (menuToggle && mainNav && menuToggle.dataset.globalReady !== 'true') {
            menuToggle.dataset.globalReady = 'true';
            menuToggle.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                menuToggle.classList.toggle('active');
                mainNav.classList.toggle('active');
                if (!mainNav.classList.contains('active')) {
                    document.querySelectorAll('.dropdown').forEach(dropdown => dropdown.classList.remove('open'));
                }
            }, true);
        }

        initMobileDropdowns();
        initScrollNavigation();
        cleanupFooterSocialLinks();

        if (mainNav) {
            const navLinks = mainNav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (menuToggle.classList.contains('active')) {
                        menuToggle.classList.remove('active');
                        mainNav.classList.remove('active');
                        document.querySelectorAll('.dropdown').forEach(dropdown => dropdown.classList.remove('open'));
                    }
                });
            });
        }

        if (menuToggle && mainNav && document.body.dataset.mobileMenuOutsideClickReady !== 'true') {
            document.body.dataset.mobileMenuOutsideClickReady = 'true';
            document.addEventListener('click', (event) => {
                if (!mainNav.classList.contains('active')) return;
                if (mainNav.contains(event.target) || menuToggle.contains(event.target)) return;
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.querySelectorAll('.dropdown').forEach(dropdown => dropdown.classList.remove('open'));
            });
        }

        let floatingCart = document.getElementById('readora-floating-cart');
        if (!floatingCart) {
            floatingCart = document.createElement('a');
            floatingCart.id = 'readora-floating-cart';
            floatingCart.className = 'readora-floating-cart';
            floatingCart.href = 'payment.html';
            floatingCart.setAttribute('aria-label', 'View your cart');
            floatingCart.innerHTML = '<span class="floating-cart-count"><i class="fas fa-shopping-bag" aria-hidden="true"></i></span><span class="floating-cart-label"><span class="floating-cart-title">View cart</span><span class="floating-cart-subtitle"></span></span><i class="fas fa-arrow-right" aria-hidden="true"></i>';
            document.body.appendChild(floatingCart);
        }
        let previousCartIds = null;
        const refreshFloatingCart = () => {
            let items = [];
            try { items = JSON.parse(localStorage.getItem('readoraCart') || '[]'); } catch (_) { items = []; }
            if (!Array.isArray(items)) items = [];
            const currentCartIds = new Set(items.map((item, index) => String(item.id ?? item.bookId ?? item.title ?? index)));
            const hasNewBook = previousCartIds !== null && [...currentCartIds].some(id => !previousCartIds.has(id));
            previousCartIds = currentCartIds;
            const count = items.reduce((sum, item) => {
                const quantity = Number(item.quantity);
                return sum + (Number.isFinite(quantity) ? Math.max(0, quantity) : 1);
            }, 0);
            floatingCart.querySelector('.floating-cart-count').textContent = count;
            floatingCart.querySelector('.floating-cart-subtitle').textContent = count === 1 ? '1 item in your cart' : `${count} items in your cart`;
            floatingCart.classList.toggle('visible', count > 0);
            floatingCart.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
            if (hasNewBook && count > 0) {
                floatingCart.classList.remove('just-added');
                void floatingCart.offsetWidth;
                floatingCart.classList.add('just-added');
            }
        };
        refreshFloatingCart();
        if (document.body.dataset.floatingCartReady !== 'true') {
            document.body.dataset.floatingCartReady = 'true';
            window.addEventListener('storage', refreshFloatingCart);
            window.setInterval(refreshFloatingCart, 300);
        }

        const searchButton = document.getElementById('search-button');
        const searchInput = document.getElementById('search-input');
        const searchOptions = document.getElementById('search-filter-options');
        if (searchButton && searchInput && searchOptions && searchButton.dataset.globalReady !== 'true') {
            searchButton.dataset.globalReady = 'true';
            const runSearch = () => {
                const query = searchInput.value.trim();
                if (!query) return;
                if (typeof window.updateSearchClearButton === 'function') {
                    window.updateSearchClearButton();
                }
                searchOptions.style.display = 'flex';
                if (typeof window.performSearch === 'function') {
                    window.performSearch(query);
                }
            };
            searchButton.addEventListener('click', runSearch);
            searchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    runSearch();
                }
            });
            searchInput.addEventListener('input', () => {
                if (typeof window.updateSearchClearButton === 'function') {
                    window.updateSearchClearButton();
                }
            });
            searchInput.addEventListener('paste', () => {
                setTimeout(() => {
                    if (typeof window.updateSearchClearButton === 'function') {
                        window.updateSearchClearButton();
                    }
                }, 0);
            });
        }
    }

    function cleanupFooterSocialLinks() {
        document.querySelectorAll('footer .social-links').forEach(links => {
            links.querySelectorAll('.social-link.whatsapp').forEach(link => link.remove());
        });
    }

    window.renderPaginatedBooks = function(options) {
        let { items, grid, createCard, emptyMessage = 'No books found.', afterRender } = options;

        if (!grid || typeof createCard !== 'function') return;
        items = dedupeBooksByUnifiedName(items || []);

        let pageIndex = 0;
        let hasShownMore = false;

        function buildPagerButton(label, nextIndex, disabled, onClick) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'show-more-btn';
            button.textContent = label;
            button.disabled = disabled;
            button.addEventListener('click', () => onClick(nextIndex));
            return button;
        }

        function render() {
            grid.innerHTML = '';
            let sibling = grid.nextElementSibling;
            while (sibling && (sibling.classList.contains('show-more-wrapper') || sibling.classList.contains('category-end-message'))) {
                const toRemove = sibling;
                sibling = sibling.nextElementSibling;
                toRemove.remove();
            }

            if (!items.length) {
                grid.innerHTML = `<p class="no-books">${emptyMessage}</p>`;
                window.currentFilteredBooks = [];
                if (typeof afterRender === 'function') afterRender();
                return;
            }

            const maxPageIndex = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
            pageIndex = Math.min(Math.max(pageIndex, 0), maxPageIndex);
            const pageStart = pageIndex * PAGE_SIZE;
            const pageItems = items.slice(pageStart, pageStart + PAGE_SIZE);

            window.currentFilteredBooks = pageItems; // <-- lets swipe-handler.js swipe within the current page
            pageItems.forEach(item => grid.appendChild(createCard(item)));

            const goToPage = (nextIndex) => {
                pageIndex = nextIndex;
                hasShownMore = true;
                render();
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };

            if (pageIndex >= maxPageIndex) {
                const endMsg = document.createElement('div');
                endMsg.className = 'category-end-message';
                endMsg.textContent = 'No Books Available In this Category';
                grid.insertAdjacentElement('afterend', endMsg);
            }

            if (items.length > PAGE_SIZE) {
                const buttonWrap = document.createElement('div');
                buttonWrap.className = 'show-more-wrapper';

                if (!hasShownMore && pageIndex === 0) {
                    buttonWrap.appendChild(buildPagerButton('Show More', 1, pageIndex >= maxPageIndex, goToPage));
                } else {
                    buttonWrap.style.display = 'flex';
                    buttonWrap.style.justifyContent = 'center';
                    buttonWrap.style.alignItems = 'center';
                    buttonWrap.style.gap = '12px';
                    buttonWrap.appendChild(buildPagerButton('Previous', pageIndex - 1, pageIndex <= 0, goToPage));
                    buttonWrap.appendChild(buildPagerButton('Next', pageIndex + 1, pageIndex >= maxPageIndex, goToPage));
                }
                grid.insertAdjacentElement('afterend', buttonWrap);
            }

            // Let swipe-handler.js auto-advance to the next/previous page when the
            // user swipes past the first/last book of the current page — same
            // behavior as the home page's category pager.
            window.ReadoraPaging = {
                shiftMobilePageForSwipe(direction, currentId) {
                    if (window.innerWidth > 768) return '';
                    const pageIds = pageItems.map(book => String(book.id));
                    const currentIndex = pageIds.indexOf(String(currentId));
                    const isLastVisibleBook = currentIndex === pageIds.length - 1;
                    const isFirstVisibleBook = currentIndex === 0;

                    if (direction > 0 && isLastVisibleBook && pageIndex < maxPageIndex) {
                        goToPage(pageIndex + 1);
                        return String(window.currentFilteredBooks[0]?.id || '');
                    }
                    if (direction < 0 && isFirstVisibleBook && pageIndex > 0) {
                        goToPage(pageIndex - 1);
                        return String(window.currentFilteredBooks[window.currentFilteredBooks.length - 1]?.id || '');
                    }
                    return '';
                }
            };

            if (typeof afterRender === 'function') afterRender();
        }

        render();
    };

    if (!document.getElementById('readora-category-end-message-style')) {
        const endMsgStyle = document.createElement('style');
        endMsgStyle.id = 'readora-category-end-message-style';
        endMsgStyle.textContent = `
            .category-end-message { text-align: center; color: #555; font-size: 20px; font-weight: 600; margin: 10px 0 18px 0; padding: 10px 16px; }
            @media (max-width: 480px) { .category-end-message { font-size: 16px; padding: 8px 10px; } }
        `;
        document.head.appendChild(endMsgStyle);
    }

    window.ReadoraUI = { PAGE_SIZE, initHeader, initMobileDropdowns, cleanupFooterSocialLinks, openCartModal, MOBILE_BREAKPOINT };
    ready(initHeader);
})();
