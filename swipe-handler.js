// Swipe Handler for the Book Details modal

(function() {
    const SWIPE_THRESHOLD = 80;
    const VERTICAL_CANCEL_THRESHOLD = 40;
    let activeSwipe = null;
    let activeBookId = '';
    let swipeHintTimer = null;
    let suppressNextSwipeHint = false;

    function rememberCurrentBook(bookId) {
        activeBookId = bookId == null ? '' : String(bookId);

        const modalAddButton = document.getElementById('modal-add-btn');
        if (modalAddButton) {
            modalAddButton.dataset.id = activeBookId;
        }
    }

    function getPoint(event) {
        return event.touches ? event.touches[0] : event;
    }

    function ensureSwipeHintStyles() {
        if (document.getElementById('readora-swipe-hint-style')) return;

        const style = document.createElement('style');
        style.id = 'readora-swipe-hint-style';
        style.textContent = `
            .readora-swipe-hint {
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 100000;
                background: rgba(45, 52, 54, 0.94);
                color: #fff;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
                font-size: 13px;
                line-height: 1.45;
                text-align: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .readora-swipe-hint.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(style);
    }

    function showSwipeHint() {
        if (window.innerWidth > 768) return;

        ensureSwipeHintStyles();

        let hint = document.getElementById('readora-swipe-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'readora-swipe-hint';
            hint.className = 'readora-swipe-hint';
            document.body.appendChild(hint);
        }

        hint.innerHTML = 'swipe left for next book<br>swipe right for previous book';
        clearTimeout(swipeHintTimer);

        requestAnimationFrame(() => hint.classList.add('show'));
        swipeHintTimer = setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => {
                if (!hint.classList.contains('show')) hint.remove();
            }, 220);
        }, 3000);
    }

    function resetBookDetailsScroll() {
        const modalBody = document.querySelector('#book-details-modal .modal-body');
        const panel = document.getElementById('book-details-content');

        requestAnimationFrame(() => {
            if (modalBody) modalBody.scrollTop = 0;
            if (panel) panel.scrollTop = 0;
        });
    }

    function getCurrentBookId() {
        const detailsButton = document.getElementById('details-add-to-cart-btn');
        if (detailsButton?.dataset.id) return String(detailsButton.dataset.id);

        const modalAddButton = document.getElementById('modal-add-btn');
        if (modalAddButton?.dataset.id) return String(modalAddButton.dataset.id);

        return activeBookId;
    }

    function getSwipeBookIds(currentId) {
        // 1. STRICT MATCH: Uses the globally tracked active filter array 
        // (Solves the issue where it swipes through unrelated books)
        if (window.currentFilteredBooks && window.currentFilteredBooks.length > 0) {
            const ids = window.currentFilteredBooks.map(b => String(b.id));
            if (ids.includes(currentId)) return ids;
        }

        // 2. FALLBACK: Use whatever buttons are currently visible on screen
        const buttons = Array.from(document.querySelectorAll('.book-card .add-to-cart-btn[data-id]'));
        const pageIds = [];
        buttons.forEach(button => {
            const card = button.closest('.book-card');
            const modal = button.closest('.modal');
            if (!card || (modal && modal.id === 'book-details-modal')) return;
            const id = String(button.dataset.id);
            if (id && !pageIds.includes(id)) pageIds.push(id);
        });

        if (pageIds.includes(currentId)) return pageIds;
        return [];
    }

    function getAdjacentBookId(direction) {
        const currentId = getCurrentBookId();
        if (!currentId) return;

        const ids = getSwipeBookIds(currentId);
        if (ids.length < 2) return;

        const currentIndex = ids.indexOf(currentId);
        if (currentIndex === -1) return;

        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < ids.length) return ids[nextIndex];

        if (window.ReadoraPaging && typeof window.ReadoraPaging.shiftMobilePageForSwipe === 'function') {
            return window.ReadoraPaging.shiftMobilePageForSwipe(direction, currentId);
        }

        return '';
    }

    function openAdjacentBook(direction, adjacentId) {
        adjacentId = adjacentId || getAdjacentBookId(direction);
        if (!adjacentId) return false;

        rememberCurrentBook(adjacentId);
        suppressNextSwipeHint = true;
        
        if (typeof window.showExerciseDetails === 'function' && window.exerciseCopies?.some(c => String(c.id) === adjacentId)) {
            window.showExerciseDetails(adjacentId);
        } else if (typeof window.showBookDetails === 'function') {
            window.showBookDetails(adjacentId);
        }
        return true;
    }

    function resetDetailsPanel(panel) {
        panel.style.transition = '';
        panel.style.transform = '';
        panel.style.opacity = '';
        panel.style.willChange = '';
        panel.style.filter = '';
        panel.style.visibility = '';
    }

    function animateToAdjacentBook(panel, direction) {
        const adjacentId = getAdjacentBookId(direction);
        if (!adjacentId) {
            resetDetailsPanel(panel);
            return;
        }

        const rect = panel.getBoundingClientRect();
        const exitX = direction > 0 ? -window.innerWidth * 1.25 : window.innerWidth * 1.25;
        const ghost = panel.cloneNode(true);

        ghost.removeAttribute('id');
        ghost.dataset.swipeGhost = 'true';
        ghost.style.position = 'fixed';
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = '99999';
        ghost.style.pointerEvents = 'none';
        ghost.style.transformOrigin = '50% 80%';
        ghost.style.transform = 'none';
        ghost.style.opacity = '1';
        ghost.style.willChange = 'transform, opacity';
        ghost.style.transition = '';
        document.body.appendChild(ghost);

        panel.style.visibility = 'hidden';
        openAdjacentBook(direction, adjacentId);
        panel.style.visibility = 'visible';
        panel.style.transition = '';
        panel.style.transform = 'translateY(26px) scale(0.965)';
        panel.style.opacity = '0.72';
        panel.style.filter = 'blur(0.2px)';
        panel.style.willChange = 'transform, opacity, filter';

        ghost.offsetHeight;
        panel.offsetHeight;

        requestAnimationFrame(() => {
            ghost.style.transition = 'transform 0.34s cubic-bezier(0.22, 0.7, 0.24, 1), opacity 0.28s ease';
            ghost.style.transform = `translateX(${exitX}px) translateY(-12px) rotate(${direction * -14}deg)`;
            ghost.style.opacity = '0';

            panel.style.transition = 'transform 0.34s cubic-bezier(0.22, 0.7, 0.24, 1), opacity 0.24s ease, filter 0.24s ease';
            panel.style.transform = '';
            panel.style.opacity = '1';
            panel.style.filter = '';
        });

        setTimeout(() => {
            ghost.remove();
            resetDetailsPanel(panel);
        }, 380);
    }

    function attachBookDetailsSwipe() {
        const panel = document.getElementById('book-details-content');
        const modal = document.getElementById('book-details-modal');
        if (!panel || !modal || panel.dataset.swipeReady === 'true') return;

        panel.dataset.swipeReady = 'true';
        panel.style.touchAction = 'pan-y';

        const onStart = (event) => {
            if (window.innerWidth > 768 || !event.type.startsWith('touch')) return;
            if (event.target.closest('button, a, input, textarea, select')) return;
            if (document.querySelector('[data-swipe-ghost="true"]')) return;

            const point = getPoint(event);
            activeSwipe = {
                startX: point.clientX,
                startY: point.clientY,
                currentX: point.clientX,
                currentY: point.clientY,
                isHorizontal: false,
                isCancelled: false
            };
        };

        const onMove = (event) => {
            if (!activeSwipe) return;

            const point = getPoint(event);
            activeSwipe.currentX = point.clientX;
            activeSwipe.currentY = point.clientY;

            const deltaX = activeSwipe.currentX - activeSwipe.startX;
            const deltaY = activeSwipe.currentY - activeSwipe.startY;

            if (!activeSwipe.isHorizontal && Math.abs(deltaY) > VERTICAL_CANCEL_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
                activeSwipe.isCancelled = true;
                resetDetailsPanel(panel);
                return;
            }

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
                activeSwipe.isHorizontal = true;
                if (event.cancelable) event.preventDefault();
                panel.style.transition = '';
                panel.style.willChange = 'transform, opacity';
                panel.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.08}deg)`;
            }
        };

        const onEnd = () => {
            if (!activeSwipe) return;

            const deltaX = activeSwipe.currentX - activeSwipe.startX;
            const shouldSwipe = !activeSwipe.isCancelled && activeSwipe.isHorizontal && Math.abs(deltaX) >= SWIPE_THRESHOLD;
            activeSwipe = null;

            if (shouldSwipe) {
                animateToAdjacentBook(panel, deltaX < 0 ? 1 : -1);
            } else {
                panel.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
                panel.style.transform = '';
                panel.style.opacity = '1';
                setTimeout(() => resetDetailsPanel(panel), 240);
            }
        };

        const onCancel = () => {
            activeSwipe = null;
            panel.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
            panel.style.transform = '';
            panel.style.opacity = '1';
            setTimeout(() => resetDetailsPanel(panel), 240);
        };

        panel.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onCancel);
        window.addEventListener('blur', onCancel);
    }

    function wrapDetailsOpeners() {
        if (typeof window.showBookDetails === 'function' && window.showBookDetails.swipeWrapped !== true) {
            const originalShowBookDetails = window.showBookDetails;
            window.showBookDetails = function(bookId, ...rest) {
                rememberCurrentBook(bookId);
                const result = originalShowBookDetails.call(this, bookId, ...rest);
                resetBookDetailsScroll();
                if (suppressNextSwipeHint) suppressNextSwipeHint = false;
                else showSwipeHint();
                return result;
            };
            window.showBookDetails.swipeWrapped = true;
        }

        if (typeof window.showExerciseDetails === 'function' && window.showExerciseDetails.swipeWrapped !== true) {
            const originalShowExerciseDetails = window.showExerciseDetails;
            window.showExerciseDetails = function(copyId, ...rest) {
                rememberCurrentBook(copyId);
                const result = originalShowExerciseDetails.call(this, copyId, ...rest);
                resetBookDetailsScroll();
                if (suppressNextSwipeHint) suppressNextSwipeHint = false;
                else showSwipeHint();
                return result;
            };
            window.showExerciseDetails.swipeWrapped = true;
        }
    }

    document.addEventListener('DOMContentLoaded', attachBookDetailsSwipe);
    document.addEventListener('DOMContentLoaded', wrapDetailsOpeners);
    wrapDetailsOpeners();
})();
