/**
 * Readora Security Utilities
 * Provides XSS protection, input sanitization, and security helpers
 */

(function() {
    'use strict';

    const SecurityUtils = {
        /**
         * Escapes HTML special characters to prevent XSS attacks
         * @param {string} str - The string to escape
         * @returns {string} - Escaped string safe for HTML context
         */
        escapeHTML: function(str) {
            if (typeof str !== 'string') return str;
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Safely sets text content on an element
         * @param {HTMLElement} element - The target element
         * @param {string} text - The text to set
         */
        safeSetText: function(element, text) {
            if (element && text !== undefined) {
                element.textContent = text;
            }
        },

        /**
         * Safely sets HTML content on an element with sanitization
         * @param {HTMLElement} element - The target element
         * @param {string} html - The HTML to set (will be sanitized)
         */
        safeSetHTML: function(element, html) {
            if (element && html !== undefined) {
                // Only allow basic formatting tags
                const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'];
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Remove disallowed tags
                const allElements = tempDiv.getElementsByTagName('*');
                for (let i = allElements.length - 1; i >= 0; i--) {
                    const el = allElements[i];
                    if (!allowedTags.includes(el.tagName.toLowerCase())) {
                        el.parentNode.removeChild(el);
                    }
                }
                
                // Remove event handlers and javascript: protocols
                const allElements2 = tempDiv.getElementsByTagName('*');
                for (let i = 0; i < allElements2.length; i++) {
                    const el = allElements2[i];
                    // Remove all event attributes
                    const attrs = el.attributes;
                    for (let j = attrs.length - 1; j >= 0; j--) {
                        const attr = attrs[j];
                        if (attr.name.startsWith('on')) {
                            el.removeAttribute(attr.name);
                        }
                    }
                    // Remove javascript: hrefs
                    if (el.tagName.toLowerCase() === 'a' && el.href) {
                        if (el.href.toLowerCase().startsWith('javascript:')) {
                            el.removeAttribute('href');
                        }
                    }
                }
                
                element.innerHTML = tempDiv.innerHTML;
            }
        },

        /**
         * Sanitizes input to prevent formula injection in spreadsheets
         * @param {string} str - The string to sanitize
         * @returns {string} - Sanitized string
         */
        sanitizeForSpreadsheet: function(str) {
            if (typeof str !== 'string') return str;
            // Escape formula injection characters
            return str
                .replace(/^=/, "'=")
                .replace(/^\+/, "'+")
                .replace(/^-/, "'-")
                .replace(/^@/, "'@")
                .replace(/^0x/, "'0x");
        },

        /**
         * Validates and sanitizes user input
         * @param {string} str - The input string
         * @param {number} maxLength - Maximum allowed length
         * @returns {string} - Sanitized string
         */
        sanitizeInput: function(str, maxLength = 1000) {
            if (typeof str !== 'string') return '';
            // Trim and limit length
            let sanitized = str.trim().slice(0, maxLength);
            // Remove potentially dangerous characters
            sanitized = sanitized.replace(/[<>]/g, '');
            return sanitized;
        },

        /**
         * Validates a price value
         * @param {number|string} price - The price to validate
         * @returns {number|null} - Validated price or null if invalid
         */
        validatePrice: function(price) {
            const numPrice = parseFloat(price);
            if (isNaN(numPrice) || numPrice < 0 || numPrice > 100000) {
                return null;
            }
            return numPrice;
        },

        /**
         * Generates a CSRF token
         * @returns {string} - CSRF token
         */
        generateCSRFToken: function() {
            const array = new Uint32Array(4);
            crypto.getRandomValues(array);
            return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
        },

        /**
         * Creates a safe URL parameter string
         * @param {object} params - Object with key-value pairs
         * @returns {string} - URL-encoded parameter string
         */
        createSafeURLParams: function(params) {
            return Object.keys(params)
                .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
                .join('&');
        },

        /**
         * Validates a book ID
         * @param {string} id - The ID to validate
         * @returns {boolean} - True if valid
         */
        validateBookId: function(id) {
            if (typeof id !== 'string') return false;
            // Allow alphanumeric, hyphens, and underscores
            return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 100;
        },

        /**
         * Validates quantity
         * @param {number} qty - The quantity to validate
         * @param {number} max - Maximum allowed quantity
         * @returns {number|null} - Validated quantity or null if invalid
         */
        validateQuantity: function(qty, max = 10) {
            const numQty = parseInt(qty, 10);
            if (isNaN(numQty) || numQty < 1 || numQty > max) {
                return null;
            }
            return numQty;
        }
    };

    // Expose to global scope
    window.SecurityUtils = SecurityUtils;

})();
