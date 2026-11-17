const { Client } = require('pg');
const EventEmitter = require('events');
require('dotenv').config();

class CourseEventEmitter extends EventEmitter {}
const courseEmitter = new CourseEventEmitter();
courseEmitter.setMaxListeners(200);

let listenClient = null;
let isConnecting = false;
let reconnectTimer = null;

/**
 * Initialize PostgreSQL LISTEN client for tailorlearn_course_events
 */
async function initListener() {
    if (isConnecting || listenClient) return;
    isConnecting = true;

    try {
        const isProduction = process.env.NODE_ENV === 'production';
        const isRemoteDb = process.env.DATABASE_URL && 
            !process.env.DATABASE_URL.includes('localhost') && 
            !process.env.DATABASE_URL.includes('127.0.0.1');

        let dbUrl = process.env.DATABASE_URL || '';
        dbUrl = dbUrl.replace(/[?&]channel_binding=[^&]+/g, '');

        listenClient = new Client({
            connectionString: dbUrl,
            ssl: (isProduction || isRemoteDb) ? { rejectUnauthorized: false } : false
        });

        listenClient.on('notification', (msg) => {
            if (msg.channel === 'tailorlearn_course_events' && msg.payload) {
                try {
                    const data = JSON.parse(msg.payload);
                    if (data && data.courseId) {
                        courseEmitter.emit(`course:${data.courseId}`, data);
                    }
                } catch (err) {
                    console.error('[LISTEN/NOTIFY] Error parsing payload:', err.message);
                }
            }
        });

        listenClient.on('error', (err) => {
            console.error('[LISTEN/NOTIFY] Connection error:', err.message);
            scheduleReconnect();
        });

        listenClient.on('end', () => {
            console.warn('[LISTEN/NOTIFY] Connection ended, reconnecting...');
            scheduleReconnect();
        });

        await listenClient.connect();
        await listenClient.query('LISTEN tailorlearn_course_events');
        console.log('[LISTEN/NOTIFY] PostgreSQL listener active on channel "tailorlearn_course_events"');
        isConnecting = false;
    } catch (err) {
        console.error('[LISTEN/NOTIFY] Failed to initialize listener:', err.message);
        isConnecting = false;
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (listenClient) {
        try {
            listenClient.end();
        } catch (_) {}
        listenClient = null;
    }
    if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            initListener();
        }, 5000);
    }
}

/**
 * Emit event locally (in addition to pg_notify) to immediately reach clients on this node
 */
function emitLocal(courseId, data) {
    if (courseId) {
        courseEmitter.emit(`course:${courseId}`, data);
    }
}

/**
 * Subscribe to course-scoped events
 * @param {string} courseId
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
function subscribe(courseId, callback) {
    const channel = `course:${courseId}`;
    courseEmitter.on(channel, callback);
    return () => {
        courseEmitter.off(channel, callback);
    };
}

module.exports = {
    initListener,
    emitLocal,
    subscribe
};

