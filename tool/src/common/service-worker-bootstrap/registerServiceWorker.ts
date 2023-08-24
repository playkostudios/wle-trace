import { checkIfWorkerIsOurs } from './checkIfWorkerIsOurs.js';
import { waitForServiceWorker } from './waitForServiceWorker.js';

export async function registerServiceWorker(normalizedServiceWorkerPath: string, scope: string, timeoutMS: number) {
    const navServiceWorker = navigator.serviceWorker;

    // register
    await navServiceWorker.register(normalizedServiceWorkerPath, { scope });

    // wait for it to load
    const serviceWorker = navServiceWorker.controller;
    if (!serviceWorker) {
        throw new Error('Service worker was registered, but not available');
    }

    await waitForServiceWorker(serviceWorker);

    // verify that it's a wle-trace service worker
    checkIfWorkerIsOurs(timeoutMS);
    return serviceWorker;
}