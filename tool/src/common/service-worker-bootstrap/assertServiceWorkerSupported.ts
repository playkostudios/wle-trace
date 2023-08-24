export function assertServiceWorkerSupported() {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers not supported; a service worker is needed to patch the Wonderland Engine API. Please update your browser, or switch to localhost/HTTPS');
    }
}