/**
 * Readora FAQ Chatbot Widget
 * AI-Style Streaming Typewriter Engine
 *
 * Features:
 * - Word-by-word streaming animation (like ChatGPT / Gemini AI)
 * - Dynamic Q&A parsed from chatbot-data.html
 * - 3-minute inactivity goodbye timer
 * - Blinking cursor (caret) during AI generation
 */
(function() {
    'use strict';

    const DATA_URL = 'chatbot-data.html';
    const MAIN_MENU_LIMIT = 4;
    const WORD_STREAM_SPEED = 28;       // ms per word (AI streaming speed)
    const BULLET_STAGGER_MS = 80;        // Brief pause between bullet points
    const STORAGE_KEY = 'readora_chat_state';
    const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes timeout

    // Embedded fallback FAQ data in case file fetch fails
    const EMBEDDED_FAQ_DATA = {
        'place-order': {
            id: 'place-order',
            question: 'How do I place an order?',
            answer: 'Here\'s how to place an order:<ul><li>Browse any of our book pages or categories</li><li>Tap "Add to Cart" on the items you want</li><li>Open your cart and select Checkout</li><li>Choose your preferred chat platform (WhatsApp, Messenger, or Instagram)</li><li>Copy the auto-generated order message and paste it into the chat to confirm availability</li></ul>',
            related: ['payment-methods', 'delivery-time', 'coupons-offers']
        },
        'payment-methods': {
            id: 'payment-methods',
            question: 'What payment methods do you accept?',
            answer: 'We accept the following payment methods:<ul><li>UPI (Google Pay, PhonePe, Paytm)</li><li>Bank Transfer</li><li>Cash on Delivery (COD)</li><li>WhatsApp payment links</li></ul>',
            related: ['coupons-offers']
        },
        'coupons-offers': {
            id: 'coupons-offers',
            question: 'Are there any discount codes or special offers?',
            answer: 'Yes! Here are our current offers:<ul><li>Use coupon code <b>READORA10</b> at checkout for a 10% discount</li><li><b>Free Delivery</b> when you order 3 or more books</li></ul>',
            related: ['place-order', 'delivery-time']
        },
        'delivery-time': {
            id: 'delivery-time',
            question: 'How long does delivery take?',
            answer: 'Here\'s our delivery information:<ul><li>Standard delivery: 3–5 business days</li><li>Express delivery: 1–2 business days (additional charges apply)</li><li><b>Free Delivery</b> on orders of 3 or more books</li></ul>',
            related: ['track-order']
        },
        'track-order': {
            id: 'track-order',
            question: 'How can I track my order?',
            answer: 'Order tracking is simple:<ul><li>Once your order is confirmed, we keep you updated directly on WhatsApp</li><li>You will receive real-time status updates at each stage</li><li>For quick updates, simply send us a message on WhatsApp with your order details</li></ul>',
            related: ['contact-us']
        },
        'exercise-copies': {
            id: 'exercise-copies',
            question: 'Do you sell exercise notebooks and school supplies?',
            answer: 'Yes, Readora carries a selection of student essentials:<ul><li>Classmate & Navneet single/double line notebooks</li><li>Spiral bound notebooks & practical copies</li><li>Drawing books & math grid notebooks</li><li>Find them under the "Exercise Copy" category on our home page</li></ul>',
            related: ['place-order']
        },
        'bengali-books': {
            id: 'bengali-books',
            question: 'Do you have Bengali language books?',
            answer: 'Yes! Readora carries both Bengali and English titles:<ul><li>Browse our Bengali collection using the language filter</li><li>We feature popular authors like Rabindranath Tagore, Syed Mujtaba Ali, and more</li><li>Explore literature from leading publishers like Ananda, Dey\'s, and others</li><li>New Bengali arrivals are added regularly</li></ul>',
            related: ['request-book']
        },
        'request-book': {
            id: 'request-book',
            question: 'Can I request a book you don\'t have listed?',
            answer: 'Absolutely! Here\'s how to request a book:<ul><li>Search for the title using our search bar</li><li>If not found, tap the WhatsApp, Instagram, or Facebook button</li><li>Provide the book title, author, and publisher name</li><li>We\'ll try to source it and notify you when available</li></ul>',
            related: ['contact-us']
        },
        'store-location': {
            id: 'store-location',
            question: 'Where is Readora located?',
            answer: 'Our physical address & contact details:<ul><li><b>Address:</b> Sajirhat, Madhyamgram, Kolkata, West Bengal - 700130</li><li><b>Phone / WhatsApp:</b> +91 93302 33178 / +91 91636 21264</li><li><b>Email:</b> readora07@gmail.com</li></ul>',
            related: ['contact-us']
        },
        'customer-reviews': {
            id: 'customer-reviews',
            question: 'How can I leave a review or feedback?',
            answer: 'We love hearing from our readers!<ul><li>Scroll to the footer of any page to find the "Share Your Comments" form</li><li>Provide your name, email, star rating, and comment (up to 20 words)</li><li>Check out our Reviews page to see feedback from other book lovers</li></ul>',
            related: ['contact-us']
        },
        'return-policy': {
            id: 'return-policy',
            question: 'What is your return or refund policy?',
            answer: 'Our return and refund policy:<ul><li>Returns accepted within 7 days of delivery</li><li>Books must be in original condition</li><li>Refunds processed within 5-7 business days</li><li>Customer pays return shipping unless item is defective</li><li>Contact us via WhatsApp to initiate a return</li></ul>',
            related: ['contact-us']
        },
        'contact-us': {
            id: 'contact-us',
            question: 'How can I contact Readora?',
            answer: 'You can reach us through multiple channels:<ul><li><b>WhatsApp:</b> +91 93302 33178 / +91 91636 21264</li><li><b>Instagram:</b> @readorabookshop</li><li><b>Facebook:</b> Readora Books</li><li><b>Email:</b> readora07@gmail.com</li></ul>',
            related: ['store-location', 'customer-reviews']
        }
    };

    const EMBEDDED_MAIN_MENU = ['place-order', 'coupons-offers', 'track-order', 'exercise-copies', 'bengali-books', 'request-book', 'return-policy', 'contact-us'];

    let faqMap = null;
    let mainMenuIds = [];
    let dataLoadPromise = null;
    let inactivityTimer = null;
    let isChatEnded = false;
    let askedQuestionIds = new Set();
    // Tracks the last set of suggestion buttons actually rendered (ids + render options)
    // so the chat can be restored with REAL, clickable buttons instead of dead HTML.
    let lastSuggestionsState = null;

    // Keyword -> FontAwesome icon mapping
    const ICON_RULES = [
        [/order/i, 'fa-cart-shopping'],
        [/payment|pay/i, 'fa-credit-card'],
        [/deliver|shipping/i, 'fa-truck-fast'],
        [/track/i, 'fa-location-dot'],
        [/bengali|language/i, 'fa-language'],
        [/request|book/i, 'fa-book-open'],
        [/return|refund/i, 'fa-rotate-left'],
        [/contact/i, 'fa-headset'],
        [/offer|coupon|discount/i, 'fa-tags'],
        [/notebook|copy|exercise/i, 'fa-pen-to-square'],
        [/location|store|address/i, 'fa-map-location-dot'],
        [/review|feedback/i, 'fa-star']
    ];

    function iconFor(id, question) {
        const haystack = `${id} ${question}`;
        for (const [regex, icon] of ICON_RULES) {
            if (regex.test(haystack)) return icon;
        }
        return 'fa-circle-question';
    }

    function injectStyles() {
        if (document.getElementById('rdch-styles')) return;
        const style = document.createElement('style');
        style.id = 'rdch-styles';
        style.textContent = `
            #rdch-toggle {
                position: fixed;
                right: 20px;
                bottom: 20px;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4a6fa5 0%, #166088 100%);
                color: #fff;
                border: none;
                box-shadow: 0 8px 24px rgba(74, 111, 165, 0.4);
                font-size: 26px;
                cursor: pointer;
                z-index: 99997;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: rdch-pulse 2s infinite;
            }
            @keyframes rdch-pulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(74, 111, 165, 0.4); }
                50% { box-shadow: 0 8px 32px rgba(74, 111, 165, 0.6); }
            }
            #rdch-toggle:hover {
                background: linear-gradient(135deg, #166088 0%, #0d4a6e 100%);
                transform: scale(1.08) translateY(-2px);
                box-shadow: 0 12px 36px rgba(74, 111, 165, 0.5);
            }
            #rdch-toggle .rdch-close-icon { display: none; }
            #rdch-toggle.rdch-active .rdch-chat-icon { display: none; }
            #rdch-toggle.rdch-active .rdch-close-icon { display: block; }
            #rdch-toggle.rdch-active { animation: none; }

            #rdch-badge {
                position: absolute;
                top: -2px;
                right: -2px;
                min-width: 20px;
                height: 20px;
                padding: 0 5px;
                border-radius: 10px;
                background: #ff5b5b;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                font-family: 'Montserrat', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 0 2px #fff;
                animation: rdch-badge-pop 0.4s ease;
            }
            @keyframes rdch-badge-pop {
                0% { transform: scale(0); }
                70% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            #rdch-panel {
                position: fixed;
                right: 20px;
                bottom: 95px;
                width: 380px;
                max-width: calc(100vw - 32px);
                height: 560px;
                max-height: calc(100vh - 150px);
                background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                z-index: 99996;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                overscroll-behavior: contain;
                touch-action: pan-y;
                opacity: 0;
                transform: translateY(20px) scale(0.95);
                pointer-events: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid rgba(74, 111, 165, 0.1);
            }
            #rdch-panel.rdch-open {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            #rdch-header {
                background: linear-gradient(135deg, #4a6fa5 0%, #166088 100%);
                color: #fff;
                padding: 16px 18px;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
            }
            #rdch-header::after {
                content: '';
                position: absolute;
                right: -40px;
                top: -40px;
                width: 130px;
                height: 130px;
                background: rgba(255,255,255,0.08);
                border-radius: 50%;
            }
            #rdch-header-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255,255,255,0.18);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
                position: relative;
                z-index: 1;
            }
            #rdch-header-avatar .rdch-online-dot {
                position: absolute;
                bottom: -1px;
                right: -1px;
                width: 11px;
                height: 11px;
                border-radius: 50%;
                background: #4fc3a1;
                border: 2px solid #166088;
            }
            #rdch-header-text {
                flex: 1;
                min-width: 0;
                position: relative;
                z-index: 1;
            }
            #rdch-header-text .rdch-title {
                font-family: 'Merriweather', serif;
                font-weight: 700;
                font-size: 15.5px;
                line-height: 1.2;
            }
            #rdch-header-text .rdch-subtitle {
                font-family: 'Montserrat', sans-serif;
                font-size: 11.5px;
                opacity: 0.85;
                margin-top: 2px;
            }
            #rdch-header-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: #fff;
                font-size: 16px;
                line-height: 1;
                cursor: pointer;
                opacity: 0.9;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
                position: relative;
                z-index: 1;
            }
            #rdch-header-close:hover {
                opacity: 1;
                background: rgba(255,255,255,0.3);
                transform: rotate(90deg);
            }

            #rdch-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                background:
                    radial-gradient(circle at 20% 0%, rgba(74,111,165,0.05) 0%, transparent 55%),
                    #f8f9fa;
                font-family: 'Montserrat', sans-serif;
                font-size: 14px;
                scroll-behavior: smooth;
                overscroll-behavior: contain;
            }
            #rdch-messages::-webkit-scrollbar { width: 6px; }
            #rdch-messages::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
            #rdch-messages::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
            #rdch-messages::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }

            .rdch-row {
                display: flex;
                align-items: flex-end;
                gap: 8px;
                max-width: 100%;
                animation: rdch-bubble-in 0.3s ease;
            }
            .rdch-row.rdch-user { justify-content: flex-end; }
            @keyframes rdch-bubble-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .rdch-avatar {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4a6fa5 0%, #166088 100%);
                color: #fff;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                margin-bottom: 2px;
            }
            .rdch-bubble {
                max-width: 82%;
                padding: 12px 15px;
                border-radius: 16px;
                line-height: 1.5;
            }
            .rdch-bubble.rdch-user {
                background: linear-gradient(135deg, #4fc3a1 0%, #3a9378 100%);
                color: #fff;
                border-bottom-right-radius: 4px;
                box-shadow: 0 4px 12px rgba(79, 195, 161, 0.3);
            }
            .rdch-bubble.rdch-bot {
                background: #fff;
                color: #2d3436;
                border: 1px solid #e8e8e8;
                border-bottom-left-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .rdch-bubble a { color: #4a6fa5; text-decoration: underline; }
            .rdch-bubble ul, .rdch-bubble ol {
                margin: 8px 0 2px;
                padding-left: 20px;
            }
            .rdch-bubble li {
                margin: 0 0 6px;
                line-height: 1.42;
            }
            .rdch-bubble li::marker {
                color: #4a6fa5;
                font-weight: bold;
            }

            /* Modern AI Streaming Caret */
            .rdch-caret {
                display: inline-block;
                width: 6px;
                height: 13px;
                background-color: #4a6fa5;
                margin-left: 3px;
                border-radius: 1px;
                vertical-align: middle;
                animation: rdch-caret-blink 0.6s infinite;
            }
            @keyframes rdch-caret-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.2; }
            }

            .rdch-typing-indicator {
                display: flex;
                gap: 4px;
                padding: 10px 14px;
            }
            .rdch-typing-indicator span {
                width: 7px;
                height: 7px;
                background: #9aa7bb;
                border-radius: 50%;
                animation: rdch-typing 1.4s infinite;
            }
            .rdch-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
            .rdch-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes rdch-typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-6px); }
            }

            #rdch-suggestions {
                flex-shrink: 0;
                padding: 12px 14px 14px;
                border-top: 1px solid #e8e8e8;
                background: #fff;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 220px;
                overflow-y: auto;
            }
            #rdch-suggestions::-webkit-scrollbar { width: 4px; }
            #rdch-suggestions::-webkit-scrollbar-track { background: #f1f1f1; }
            #rdch-suggestions::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 2px; }

            .rdch-suggestions-label {
                font-family: 'Montserrat', sans-serif;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                color: #9aa7bb;
                margin-bottom: 2px;
            }

            .rdch-option-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                background: #fff;
                border: 1.5px solid #e3e8f0;
                color: #2d3436;
                border-radius: 12px;
                padding: 10px 12px;
                font-size: 13.5px;
                font-family: 'Montserrat', sans-serif;
                font-weight: 500;
                text-align: left;
                cursor: pointer;
                transition: all 0.18s ease;
                opacity: 0;
                transform: translateY(6px);
                animation: rdch-option-in 0.3s ease forwards;
            }
            @keyframes rdch-option-in {
                to { opacity: 1; transform: translateY(0); }
            }
            .rdch-option-btn .rdch-option-icon {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(135deg, #eef3fb 0%, #e2ecf7 100%);
                color: #4a6fa5;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                flex-shrink: 0;
                transition: all 0.18s ease;
            }
            .rdch-option-btn .rdch-option-text { flex: 1; }
            .rdch-option-btn .rdch-option-arrow {
                color: #c3cbd8;
                font-size: 12px;
                transition: transform 0.18s ease;
                flex-shrink: 0;
            }
            .rdch-option-btn:hover {
                border-color: #4a6fa5;
                background: #f7faff;
                box-shadow: 0 4px 12px rgba(74, 111, 165, 0.15);
            }
            .rdch-option-btn:hover .rdch-option-icon {
                background: linear-gradient(135deg, #4a6fa5 0%, #166088 100%);
                color: #fff;
            }
            .rdch-option-btn:hover .rdch-option-arrow { transform: translateX(2px); color: #4a6fa5; }
            .rdch-option-btn:active { transform: translateY(0) scale(0.99); }

            .rdch-option-btn.rdch-menu-btn {
                border-style: dashed;
                border-color: #c3cbd8;
                color: #6b7684;
            }
            .rdch-option-btn.rdch-menu-btn .rdch-option-icon {
                background: #f1f2f4;
                color: #6b7684;
            }
            .rdch-option-btn.rdch-menu-btn:hover {
                border-color: #8a8a8a;
                background: #f8f9fa;
            }
            .rdch-option-btn.rdch-menu-btn:hover .rdch-option-icon {
                background: #8a8a8a;
                color: #fff;
            }

            .rdch-end-message {
                text-align: center;
                color: #8a8a8a;
                font-size: 12.5px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 12px;
                border: 1px dashed #c3cbd8;
                line-height: 1.6;
            }

            @media (max-width: 480px) {
                #rdch-panel {
                    right: 12px;
                    left: 12px;
                    width: auto;
                    bottom: 88px;
                    height: calc(100vh - 120px);
                }
                #rdch-toggle { right: 16px; bottom: 16px; width: 58px; height: 58px; }
                .rdch-bubble { font-size: 13px; padding: 10px 14px; }
                .rdch-option-btn { font-size: 13px; padding: 9px 11px; }
            }
        `;
        document.head.appendChild(style);
    }

    function buildDom() {
        if (document.getElementById('rdch-toggle')) return;

        const toggle = document.createElement('button');
        toggle.id = 'rdch-toggle';
        toggle.setAttribute('aria-label', 'Chat with Readora');
        toggle.innerHTML = `
            <i class="fas fa-comment-dots rdch-chat-icon"></i>
            <i class="fas fa-times rdch-close-icon"></i>
            <span id="rdch-badge">1</span>
        `;
        document.body.appendChild(toggle);

        const panel = document.createElement('div');
        panel.id = 'rdch-panel';
        panel.innerHTML = `
            <div id="rdch-header">
                <div id="rdch-header-avatar">
                    <i class="fas fa-book-open"></i>
                    <span class="rdch-online-dot"></span>
                </div>
                <div id="rdch-header-text">
                    <div class="rdch-title">Readora Assistant</div>
                    <div class="rdch-subtitle">Usually replies instantly</div>
                </div>
                <button id="rdch-header-close" aria-label="Close chat"><i class="fas fa-times"></i></button>
            </div>
            <div id="rdch-messages"></div>
            <div id="rdch-suggestions"></div>
        `;
        document.body.appendChild(panel);

        toggle.addEventListener('click', togglePanel);
        panel.querySelector('#rdch-header-close').addEventListener('click', closePanel);
    }

    // Inactivity Timer Functions
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        if (isChatEnded) return;

        inactivityTimer = setTimeout(() => {
            endChatDueToInactivity();
        }, INACTIVITY_TIMEOUT_MS);
    }

    async function endChatDueToInactivity() {
        if (isChatEnded) return;
        isChatEnded = true;

        showTypingIndicator();
        await wait(500);
        removeTypingIndicator();

        const goodbyeMsg = "It looks like you've been inactive for a while. 👋 Goodbye! Feel free to restart the chat anytime if you need help. Happy reading!";
        const bubble = appendRow('', 'bot');
        await typeAiStream(bubble, goodbyeMsg);

        const container = document.getElementById('rdch-suggestions');
        container.innerHTML = `
            <div class="rdch-end-message">
                <i class="fas fa-circle-stop" style="color: #ff5b5b; margin-right: 4px;"></i> Chat ended due to inactivity.<br>
                <a href="#" id="rdch-restart-link" style="color: #4a6fa5; font-weight: 700; text-decoration: underline;">Start a new chat</a>
            </div>
        `;

        const restartBtn = document.getElementById('rdch-restart-link');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                restartChat();
            });
        }
    }

    function restartChat() {
        isChatEnded = false;
        clearChatState();
        document.getElementById('rdch-messages').innerHTML = '';
        startConversation();
    }

    // State persistence
    function saveChatState(messages) {
        try {
            const state = {
                messages: messages.map(row => {
                    const bubble = row.querySelector('.rdch-bubble');
                    return {
                        sender: row.classList.contains('rdch-user') ? 'user' : 'bot',
                        html: bubble ? bubble.innerHTML : ''
                    };
                }),
                // Store the actual ids/options that were rendered (not raw HTML) so
                // restoring the chat can rebuild real, clickable buttons.
                suggestionsState: lastSuggestionsState,
                askedQuestionIds: Array.from(askedQuestionIds),
                isChatEnded: isChatEnded,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save chat state:', e);
        }
    }

    function loadChatState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to load chat state:', e);
            return null;
        }
    }

    function clearChatState() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function isPageRefresh() {
        try {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                return navEntries[0].type === 'reload';
            }
            if (performance.navigation) {
                return performance.navigation.type === 1;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function togglePanel() {
        const panel = document.getElementById('rdch-panel');
        const toggle = document.getElementById('rdch-toggle');
        const isOpen = panel.classList.contains('rdch-open');
        if (isOpen) {
            closePanel();
        } else {
            panel.classList.add('rdch-open');
            toggle.classList.add('rdch-active');
            const badge = document.getElementById('rdch-badge');
            if (badge) badge.remove();

            if (!panel.dataset.initialized) {
                panel.dataset.initialized = 'true';
                if (isPageRefresh()) {
                    clearChatState();
                    startConversation();
                } else {
                    const savedState = loadChatState();
                    if (savedState && savedState.messages && savedState.messages.length > 0) {
                        restoreChatState(savedState);
                    } else {
                        startConversation();
                    }
                }
            } else {
                resetInactivityTimer();
            }
        }
    }

    function closePanel() {
        const panel = document.getElementById('rdch-panel');
        const messages = document.getElementById('rdch-messages');

        if (panel.classList.contains('rdch-open')) {
            saveChatState(Array.from(messages.children));
        }

        panel.classList.remove('rdch-open');
        document.getElementById('rdch-toggle').classList.remove('rdch-active');
        clearTimeout(inactivityTimer);
    }

    function restoreChatState(state) {
        const messages = document.getElementById('rdch-messages');
        messages.innerHTML = '';

        isChatEnded = !!state.isChatEnded;
        askedQuestionIds = new Set(Array.isArray(state.askedQuestionIds) ? state.askedQuestionIds : []);

        state.messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = `rdch-row rdch-${msg.sender}`;

            const bubble = document.createElement('div');
            bubble.className = `rdch-bubble rdch-${msg.sender}`;
            bubble.innerHTML = msg.html;

            if (msg.sender === 'bot') {
                const avatar = document.createElement('div');
                avatar.className = 'rdch-avatar';
                avatar.innerHTML = '<i class="fas fa-book-open"></i>';
                row.appendChild(avatar);
                row.appendChild(bubble);
            } else {
                row.appendChild(bubble);
            }

            messages.appendChild(row);
        });

        messages.scrollTop = messages.scrollHeight;

        if (isChatEnded) {
            // Rebuild the "chat ended" panel with a real, working restart link
            // rather than relying on dead HTML from storage.
            const container = document.getElementById('rdch-suggestions');
            container.innerHTML = `
                <div class="rdch-end-message">
                    <i class="fas fa-circle-stop" style="color: #ff5b5b; margin-right: 4px;"></i> Chat ended due to inactivity.<br>
                    <a href="#" id="rdch-restart-link" style="color: #4a6fa5; font-weight: 700; text-decoration: underline;">Start a new chat</a>
                </div>
            `;
            const restartBtn = document.getElementById('rdch-restart-link');
            if (restartBtn) {
                restartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    restartChat();
                });
            }
            return;
        }

        // Rebuild suggestion buttons from the stored ids/options via renderSuggestions()
        // so they get real, working click handlers -- never from saved raw HTML, which
        // is what previously caused clicks to silently do nothing after a restore.
        loadFaqData().then(() => {
            if (state.suggestionsState && Array.isArray(state.suggestionsState.ids) && state.suggestionsState.ids.length > 0) {
                renderSuggestions(state.suggestionsState.ids, state.suggestionsState.opts || {});
            } else {
                // No valid suggestion state was saved (e.g. the tab closed mid-response)
                // -- never leave the visitor looking at a blank panel with no questions.
                showMainMenu();
            }
            resetInactivityTimer();
        });
    }

    function loadFaqData() {
        if (dataLoadPromise) return dataLoadPromise;

        dataLoadPromise = fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const items = doc.querySelectorAll('.qa-item');
                const map = {};
                const mains = [];

                if (items.length === 0) {
                    // Fallback: try to find items within the #readora-faq-data container
                    const container = doc.querySelector('#readora-faq-data');
                    if (container) {
                        const altItems = container.querySelectorAll('div[id]');
                        altItems.forEach(item => {
                            const id = item.id;
                            if (!id) return;
                            const questionEl = item.querySelector('.qa-question');
                            const answerEl = item.querySelector('.qa-answer');
                            const relatedEl = item.querySelector('.qa-related');
                            const relatedAttr = relatedEl ? (relatedEl.getAttribute('data-related') || '') : '';
                            const related = relatedAttr.split(',').map(s => s.trim()).filter(Boolean);

                            map[id] = {
                                id,
                                question: questionEl ? questionEl.innerHTML.trim() : (questionEl ? questionEl.textContent.trim() : ''),
                                answer: answerEl ? answerEl.innerHTML.trim() : (answerEl ? answerEl.textContent.trim() : ''),
                                related
                            };

                            if (item.getAttribute('data-main') === 'true') {
                                mains.push(id);
                            }
                        });
                    }
                } else {
                    items.forEach(item => {
                        const id = item.id;
                        if (!id) return;
                        const questionEl = item.querySelector('.qa-question');
                        const answerEl = item.querySelector('.qa-answer');
                        const relatedEl = item.querySelector('.qa-related');
                        const relatedAttr = relatedEl ? (relatedEl.getAttribute('data-related') || '') : '';
                        const related = relatedAttr.split(',').map(s => s.trim()).filter(Boolean);

                        map[id] = {
                            id,
                            question: questionEl ? questionEl.innerHTML.trim() : '',
                            answer: answerEl ? answerEl.innerHTML.trim() : '',
                            related
                        };

                        if (item.getAttribute('data-main') === 'true') {
                            mains.push(id);
                        }
                    });
                }

                faqMap = map;
                mainMenuIds = mains;
                return map;
            })
            .catch(err => {
                console.error('ReadoraChatbot: failed to load chatbot-data.html, using embedded fallback data', err);
                faqMap = EMBEDDED_FAQ_DATA;
                mainMenuIds = EMBEDDED_MAIN_MENU;
                // Don't lock in the failed attempt forever -- clear the cached promise so the
                // next time data is needed (reopening the panel, tapping "Main menu", etc.)
                // it tries the fetch again instead of being stuck on this tiny fallback menu
                // until the visitor refreshes the whole page.
                dataLoadPromise = null;
                return faqMap;
            });

        return dataLoadPromise;
    }

    function appendRow(html, sender) {
        const messages = document.getElementById('rdch-messages');
        const row = document.createElement('div');
        row.className = `rdch-row rdch-${sender}`;

        const bubble = document.createElement('div');
        bubble.className = `rdch-bubble rdch-${sender}`;
        bubble.innerHTML = html;

        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'rdch-avatar';
            avatar.innerHTML = '<i class="fas fa-book-open"></i>';
            row.appendChild(avatar);
            row.appendChild(bubble);
        } else {
            row.appendChild(bubble);
        }

        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    function showTypingIndicator() {
        const messages = document.getElementById('rdch-messages');
        const row = document.createElement('div');
        row.className = 'rdch-row rdch-bot';
        row.id = 'rdch-typing-row';

        const avatar = document.createElement('div');
        avatar.className = 'rdch-avatar';
        avatar.innerHTML = '<i class="fas fa-book-open"></i>';

        const indicator = document.createElement('div');
        indicator.className = 'rdch-bubble rdch-bot rdch-typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';

        row.appendChild(avatar);
        row.appendChild(indicator);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTypingIndicator() {
        const row = document.getElementById('rdch-typing-row');
        if (row) row.remove();
    }

    function scrollMessagesToBottom() {
        const messages = document.getElementById('rdch-messages');
        messages.scrollTop = messages.scrollHeight;
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- MODERN AI WORD-BY-WORD STREAMING ENGINE ---
    // Streams text token-by-token (word-by-word) like ChatGPT/Gemini
    function streamWordsInto(targetElement, rawHtml, speed) {
        return new Promise(resolve => {
            const caret = document.createElement('span');
            caret.className = 'rdch-caret';
            targetElement.appendChild(caret);

            // Split into tokens: tags vs words
            const tokens = [];
            const regex = /(<[^>]+>|[^<>\s]+|\s+)/g;
            let match;
            while ((match = regex.exec(rawHtml)) !== null) {
                tokens.push(match[0]);
            }

            let index = 0;
            function step() {
                if (index < tokens.length) {
                    const token = tokens[index];
                    caret.insertAdjacentHTML('beforebegin', token);
                    index++;
                    scrollMessagesToBottom();
                    
                    // HTML tags and spaces render instantly, words get AI stream delay
                    const delay = /^<[^>]+>$/.test(token) || /^\s+$/.test(token) ? 0 : speed;
                    setTimeout(step, delay);
                } else {
                    caret.remove();
                    resolve();
                }
            }
            step();
        });
    }

    // Renders AI response using word-by-word streaming across paragraphs and bullet lists
    async function typeAiStream(bubbleElement, fullAnswerHtml) {
        const source = document.createElement('div');
        source.innerHTML = fullAnswerHtml;

        for (const node of Array.from(source.childNodes)) {
            if (node.nodeType === 1 && /^(UL|OL)$/i.test(node.tagName)) {
                const listElement = document.createElement(node.tagName.toLowerCase());
                bubbleElement.appendChild(listElement);

                const items = Array.from(node.children).filter(c => c.tagName === 'LI');
                for (const li of items) {
                    const targetLi = document.createElement('li');
                    listElement.appendChild(targetLi);
                    scrollMessagesToBottom();
                    await streamWordsInto(targetLi, li.innerHTML.trim(), WORD_STREAM_SPEED);
                    await wait(BULLET_STAGGER_MS);
                }
            } else if (node.nodeType === 1) {
                const wrapper = document.createElement(node.tagName.toLowerCase());
                bubbleElement.appendChild(wrapper);
                await streamWordsInto(wrapper, node.innerHTML.trim(), WORD_STREAM_SPEED);
            } else if (node.nodeType === 3 && node.textContent.trim()) {
                const span = document.createElement('span');
                bubbleElement.appendChild(span);
                await streamWordsInto(span, node.textContent, WORD_STREAM_SPEED);
            }
        }
    }

    // Render option buttons
    function renderSuggestions(ids, opts) {
        if (isChatEnded) return;

        opts = opts || {};

        // Don't re-offer a question the visitor has already asked in this session.
        // Fall back to the unfiltered list if filtering would leave nothing to show.
        const filteredIds = ids.filter(id => !askedQuestionIds.has(id));
        if (filteredIds.length > 0) {
            ids = filteredIds;
        }

        // Remember exactly what was rendered so we can rebuild real, clickable
        // buttons later (e.g. when restoring a saved chat session).
        lastSuggestionsState = { ids, opts };

        const container = document.getElementById('rdch-suggestions');
        container.innerHTML = '';

        const showAll = !!opts.expanded || !!opts.showMenuButton;
        const limit = showAll ? ids.length : MAIN_MENU_LIMIT;
        const idsToShow = ids.slice(0, limit);

        if (opts.label) {
            const label = document.createElement('div');
            label.className = 'rdch-suggestions-label';
            label.textContent = opts.label;
            container.appendChild(label);
        }

        idsToShow.forEach((id, i) => {
            const entry = faqMap[id];
            if (!entry) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rdch-option-btn';
            btn.style.animationDelay = `${i * 60}ms`;
            btn.innerHTML = `
                <span class="rdch-option-icon"><i class="fas ${iconFor(id, entry.question)}"></i></span>
                <span class="rdch-option-text">${entry.question}</span>
                <i class="fas fa-chevron-right rdch-option-arrow"></i>
            `;
            btn.addEventListener('click', () => selectQuestion(id));
            container.appendChild(btn);
        });

        if (!showAll && ids.length > limit) {
            const moreBtn = document.createElement('button');
            moreBtn.type = 'button';
            moreBtn.className = 'rdch-option-btn rdch-menu-btn';
            moreBtn.style.animationDelay = `${idsToShow.length * 60}ms`;
            moreBtn.innerHTML = `
                <span class="rdch-option-icon"><i class="fas fa-ellipsis-h"></i></span>
                <span class="rdch-option-text">More topics</span>
                <i class="fas fa-chevron-right rdch-option-arrow"></i>
            `;
            moreBtn.addEventListener('click', () => renderSuggestions(ids, { expanded: true, label: opts.label }));
            container.appendChild(moreBtn);
        }

        if (opts.showMenuButton) {
            const menuBtn = document.createElement('button');
            menuBtn.type = 'button';
            menuBtn.className = 'rdch-option-btn rdch-menu-btn';
            menuBtn.style.animationDelay = `${(idsToShow.length + 1) * 60}ms`;
            menuBtn.innerHTML = `
                <span class="rdch-option-icon"><i class="fas fa-list"></i></span>
                <span class="rdch-option-text">Main menu</span>
                <i class="fas fa-chevron-right rdch-option-arrow"></i>
            `;
            menuBtn.addEventListener('click', showMainMenu);
            container.appendChild(menuBtn);
        }
    }

    function selectQuestion(id) {
        if (isChatEnded) return;

        let entry = faqMap[id];
        if (!entry) {
            // The id came from a stale render (data reloaded/changed underneath it) or the
            // FAQ fetch hadn't resolved yet. Reload the data and retry once instead of
            // silently doing nothing, which is what produced the "click does nothing" bug.
            loadFaqData().then(() => {
                if (faqMap[id]) selectQuestion(id);
                else showMainMenu();
            });
            return;
        }

        resetInactivityTimer();
        askedQuestionIds.add(id);
        appendRow(entry.question, 'user');

        document.getElementById('rdch-suggestions').innerHTML = '';
        lastSuggestionsState = null; // suggestions are mid-refresh; nothing valid to restore yet
        showTypingIndicator();

        setTimeout(async () => {
            removeTypingIndicator();
            const answerBubble = appendRow('', 'bot');
            
            // Stream message like an AI word-by-word
            await typeAiStream(answerBubble, entry.answer);

            if (isChatEnded) return;

            const hasRelated = entry.related && entry.related.length > 0;
            renderSuggestions(hasRelated ? entry.related : [], {
                showMenuButton: true,
                label: hasRelated ? 'You might also want to ask' : null
            });
        }, 450);
    }

    function showMainMenu() {
        if (isChatEnded) return;
        resetInactivityTimer();
        renderSuggestions(mainMenuIds, { label: 'Popular questions' });
    }

    function startConversation() {
        isChatEnded = false;
        askedQuestionIds = new Set();
        lastSuggestionsState = null;
        appendRow('Hi! 👋 How can I help you today? Pick a question below, or tap "Main menu" anytime to start over.', 'bot');
        loadFaqData().then(() => {
            renderSuggestions(mainMenuIds, { label: 'Popular questions' });
            resetInactivityTimer();
        }).catch(err => {
            console.error('ReadoraChatbot: Error loading FAQ data in startConversation', err);
            // Even if data loading fails, show the main menu button
            renderSuggestions([], { showMenuButton: true, label: 'Popular questions' });
            resetInactivityTimer();
        });
    }

    function isEventOverChatbot(target) {
        return !!(target && target.closest && target.closest('#rdch-panel, #rdch-toggle'));
    }

    function preventBackgroundScrollChaining() {
        const wheelHandler = (e) => {
            if (isEventOverChatbot(e.target)) {
                e.stopPropagation();
            }
        };
        const touchMoveHandler = (e) => {
            if (isEventOverChatbot(e.target)) {
                e.stopPropagation();
            }
        };
        document.addEventListener('wheel', wheelHandler, { passive: true, capture: true });
        document.addEventListener('touchmove', touchMoveHandler, { passive: true, capture: true });
    }

    function init() {
        injectStyles();
        buildDom();
        preventBackgroundScrollChaining();

        window.addEventListener('beforeunload', () => {
            if (!isPageRefresh()) {
                const panel = document.getElementById('rdch-panel');
                const messages = document.getElementById('rdch-messages');
                if (panel && messages) {
                    saveChatState(Array.from(messages.children));
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();