export function normalizeServiceWorkerPath(serviceWorkerPath: string) {
    return (new URL(serviceWorkerPath, window.location.origin)).pathname;
}