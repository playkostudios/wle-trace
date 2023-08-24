import { SERVICE_WORKER_VERSION } from './SERVICE_WORKER_VERSION.js';
import { checkIfWorkerIsOurs } from './checkIfWorkerIsOurs.js';
import { waitForServiceWorker } from './waitForServiceWorker.js';

export async function registerServiceWorker(normalizedServiceWorkerPath: string, scope: string, timeoutMS: number) {
    const navServiceWorker = navigator.serviceWorker;

    // register
    const reg = await navServiceWorker.register(normalizedServiceWorkerPath, { scope });
    const serviceWorker = reg.active ?? reg.waiting ?? reg.installing;
    if (!serviceWorker) {
        throw new Error('Service worker has unknown state');
    }

    // wait for it to load
    await waitForServiceWorker(serviceWorker);

    // verify that it's a wle-trace service worker
    const version = await checkIfWorkerIsOurs(serviceWorker, timeoutMS);
    if (version === null) {
        throw new Error('Registered service worker is not a wle-trace service worker');
    } else if (version !== SERVICE_WORKER_VERSION) {
        throw new Error('Registered service worker has a mismatched version');
    }

    return serviceWorker;
}