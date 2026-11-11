/**
 * Readora Configuration File
 * Centralized configuration for sensitive data and application settings
 * This file should be loaded before all other scripts
 */

(function() {
    'use strict';

    const ReadoraConfig = {
        // Contact Information
        contact: {
            whatsapp: {
                number: '919330233178',
                display: '+91 93302 33178'
            },
            phone: {
                primary: '919330233178',
                display: '+91 93302 33178'
            }
        },

        // Social Media Links
        social: {
            instagram: {
                url: 'https://www.instagram.com/iam_bidisha_2005',
                handle: '@iam_bidisha_2005',
                shareUrl: 'https://www.instagram.com/iam_bidisha_2005?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=='
            },
            facebook: {
                url: 'https://www.facebook.com/share/17JzLNsUGm/',
                shareUrl: 'https://www.facebook.com/share/18EYaTLuCk/',
                messengerUrl: 'https://www.facebook.com/share/18EYaTLuCk/'
            },
            whatsapp: {
                baseUrl: 'https://wa.me',
                url: 'https://wa.me/919330233178'
            }
        },

        // Application Settings
        app: {
            name: 'Readora',
            version: '1.0.0',
            currency: '₹',
            currencyCode: 'INR',
            deliveryFee: 50,
            freeDeliveryThreshold: 3,
            maxQuantityPerItem: 10,
            defaultImage: 'bookimg.jpeg'
        },

        // Google Apps Script Configuration
        googleAppsScript: {
            sheetUrl: 'https://script.google.com/macros/s/AKfycbyqYCTbrIA0c8c-YxvlvNsaVrvURkui1dm4YAD3av3OiuwKx6r_4N7AhnhLiIwwRych/exec',
            reviewEndpoint: 'https://script.google.com/macros/s/AKfycbzk4CO88rItTAx4yA4LkoetwvkIaAa7br3mz-9fHE0CGBeZTCEAhSQ9rHguwXoBYaCW/exec'
        },

        // Storage Keys
        storage: {
            cart: 'readoraCart',
            books: 'readoraBooks',
            booksVersion: 'readoraBooksVersion',
            appVersion: 'readoraAppVersion'
        },

        // Coupon Codes
        coupons: {
            'READORA10': {
                discount: 0.10,
                description: '10% discount',
                active: true
            }
        },

        // Security Settings
        security: {
            enableCSRF: true,
            sanitizeInput: true,
            maxInputLength: 1000
        }
    };

    // Expose to global scope
    window.ReadoraConfig = ReadoraConfig;

    // Helper functions
    window.ReadoraConfig.getWhatsAppUrl = function(message) {
        const encodedMessage = encodeURIComponent(message || '');
        return `${this.social.whatsapp.url}?text=${encodedMessage}`;
    };

    window.ReadoraConfig.getInstagramUrl = function() {
        return this.social.instagram.shareUrl;
    };

    window.ReadoraConfig.getFacebookUrl = function() {
        return this.social.facebook.shareUrl;
    };

    window.ReadoraConfig.getFacebookMessageUrl = function() {
        return this.social.facebook.messengerUrl;
    };

    window.ReadoraConfig.getInstagramMessageUrl = function() {
        return this.social.instagram.url;
    };

    window.ReadoraConfig.formatPrice = function(price) {
        return `${this.app.currency}${parseFloat(price).toFixed(2)}`;
    };

})();
