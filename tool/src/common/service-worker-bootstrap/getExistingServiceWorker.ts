import { SERVICE_WORKER_VERSION } from './SERVICE_WORKER_VERSION.js';
import { checkIfWorkerIsOurs } from './checkIfWorkerIsOurs.js';
import { normalizeServiceWorkerPath } from './normalizeServiceWorkerPath.js';
import { unregisterServiceWorker } from './unregisterServiceWorker.js';
import { waitForServiceWorker } from './waitForServiceWorker.js';

export async function getExistingServiceWorker(normalizedServiceWorkerPath: string, scope: string, timeoutMS: number): Promise<ServiceWorker | null> {
    const navServiceWorker = navigator.serviceWorker;
    const curServiceWorker = navServiceWorker.controller;
    if (!curServiceWorker) {
        return null;
    }

    const curRegistration = await navServiceWorker.getRegistration();
    if (!curRegistration) {
        throw new Error('Unexpected missing service worker registration');
    }

    await waitForServiceWorker(curServiceWorker);
    let curVersion = await checkIfWorkerIsOurs(timeoutMS);
    if (curVersion === null) {
        throw new Error('There is already a service worker registered, which does not belong to wle-trace. If you need a service worker other than wle-trace, use service worker composition');
    }

    if (curRegistration.scope !== scope) {
        console.warn('Current wle-trace service worker has a different scope and will be ignored');
        return null;
    }

    const curPathNorm = normalizeServiceWorkerPath(curServiceWorker.scriptURL);
    if (curPathNorm !== normalizedServiceWorkerPath) {
        console.warn('Current wle-trace service worker has a different script URL and will be unregistered');
        await unregisterServiceWorker(curRegistration);
        return null;
    }

    if (curVersion === SERVICE_WORKER_VERSION) {
        return curServiceWorker;
    } else {
        console.warn('Current wle-trace service worker is outdated and will be unregistered');
        await unregisterServiceWorker(curRegistration);
        return null;
    }
}