/**
 * Utility functions for resolving and validating media URLs (videos, PDFs, images).
 * Ensures host-specific URLs (like localhost:5000) are resolved cleanly or flagged
 * with user-friendly fallbacks when accessed in production.
 */

export function isLocalhostUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url.trim());
}

export function isProductionEnv() {
    if (import.meta.env.PROD) return true;
    if (typeof window !== 'undefined' && window.location) {
        const host = window.location.hostname;
        return host !== 'localhost' && host !== '127.0.0.1';
    }
    return false;
}

/**
 * Returns structured metadata about a media URL, including availability
 * and fallback messaging.
 */
export function getMediaInfo(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return {
            url: '',
            isAvailable: false,
            isLocalhostUnavailable: false,
            errorMessage: 'No media file URL provided.'
        };
    }

    const trimmed = rawUrl.trim();
    const isLocalhost = isLocalhostUrl(trimmed);
    const inProd = isProductionEnv();

    // If the file is pointing to localhost while user is on production (e.g. tailorlearn.vercel.app),
    // it will fail with ERR_CONNECTION_REFUSED because the file only lives on the developer's machine.
    if (isLocalhost && inProd) {
        return {
            url: trimmed,
            isAvailable: false,
            isLocalhostUnavailable: true,
            errorMessage: 'File unavailable. Teacher needs to re-upload this material to cloud storage.'
        };
    }

    // Resolve relative uploads (/uploads/...) to the configured storage or API origin
    let resolvedUrl = trimmed;
    if (trimmed.startsWith('/uploads/')) {
        const storageBase = import.meta.env.VITE_STORAGE_URL || 
            (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');
        resolvedUrl = storageBase ? `${storageBase}${trimmed}` : trimmed;
    }

    return {
        url: resolvedUrl,
        isAvailable: true,
        isLocalhostUnavailable: false,
        errorMessage: null
    };
}

/**
 * Helper to get the playable URL string
 */
export function getMediaUrl(rawUrl) {
    return getMediaInfo(rawUrl).url;
}

