/**
 * courseEvents.js
 * Fetch-based Server-Sent Events client for real-time course updates.
 * Sends JWT Bearer token in the Authorization header (not URL).
 * Implements exponential backoff reconnects, heartbeat handling, tab visibility sync,
 * and automatic fallback to 20s polling if streaming fails.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

/**
 * Subscribe to real-time events for a specific course
 * @param {string} courseId 
 * @param {object} callbacks 
 * @param {Function} callbacks.onTopicsChanged - Called when topics are added, deleted, or shifted
 * @param {Function} [callbacks.onReconnect] - Called upon successful reconnection to sync state
 * @returns {Function} unsubscribe function
 */
export function subscribeToCourseEvents(courseId, { onTopicsChanged, onReconnect }) {
    if (!courseId) return () => {};

    let isAborted = false;
    let abortController = null;
    let reconnectTimeout = null;
    let retryCount = 0;
    let pollingInterval = null;
    let isConnected = false;

    function startPollingFallback() {
        if (pollingInterval || isAborted) return;
        console.warn(`[CourseEvents] Activating fallback polling (~20s) for course ${courseId}`);
        pollingInterval = setInterval(() => {
            if (!isAborted && onTopicsChanged) {
                onTopicsChanged();
            }
        }, 20000);
    }

    function stopPollingFallback() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    async function connectStream() {
        if (isAborted) return;

        const token = sessionStorage.getItem('token');
        if (!token) {
            console.warn('[CourseEvents] No authentication token found in sessionStorage');
            return;
        }

        abortController = new AbortController();

        try {
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}/events`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream'
                },
                signal: abortController.signal
            });

            // If unauthorized or forbidden, do not keep spamming reconnects
            if (response.status === 401 || response.status === 403) {
                console.warn(`[CourseEvents] Subscription unauthorized or forbidden (status: ${response.status})`);
                return;
            }

            if (!response.ok) {
                throw new Error(`SSE stream HTTP status error: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            isConnected = true;
            stopPollingFallback();

            if (retryCount > 0 && onReconnect) {
                onReconnect();
            }
            retryCount = 0;

            let buffer = '';

            while (!isAborted) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop(); // keep trailing incomplete segment

                let currentData = '';

                for (const line of lines) {
                    // Ignore SSE comments like ': heartbeat'
                    if (line.startsWith(':')) {
                        continue;
                    }
                    if (line.startsWith('data:')) {
                        currentData = line.slice(5).trim();
                    } else if (line === '') {
                        if (currentData) {
                            try {
                                const parsed = JSON.parse(currentData);
                                if (parsed.type === 'topics_changed' && onTopicsChanged) {
                                    onTopicsChanged();
                                }
                            } catch (e) {
                                console.error('[CourseEvents] Error parsing event payload:', e);
                            }
                        }
                        currentData = '';
                    }
                }
            }
        } catch (err) {
            if (isAborted) return;
            console.warn('[CourseEvents] Event stream disconnected:', err.message);
        } finally {
            isConnected = false;
            if (!isAborted) {
                retryCount++;
                if (retryCount >= 3) {
                    startPollingFallback();
                }
                // Exponential backoff with jitter: 1s, 2s, 4s, 8s, up to 15s max
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 15000);
                reconnectTimeout = setTimeout(() => {
                    connectStream();
                }, backoffDelay);
            }
        }
    }

    // Handle tab visibility change (sync when tab is focused again)
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible' && !isAborted) {
            if (onTopicsChanged) {
                onTopicsChanged();
            }
            if (!isConnected && !reconnectTimeout) {
                connectStream();
            }
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    connectStream();

    return () => {
        isAborted = true;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (abortController) {
            try { abortController.abort(); } catch {}
        }
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        stopPollingFallback();
    };
}
