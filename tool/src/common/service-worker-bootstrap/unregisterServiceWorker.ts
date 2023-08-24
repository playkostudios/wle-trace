export async function unregisterServiceWorker(reg: ServiceWorkerRegistration) {
    if (!await reg.unregister()) {
        throw new Error('Failed to unregister service worker');
    }
}