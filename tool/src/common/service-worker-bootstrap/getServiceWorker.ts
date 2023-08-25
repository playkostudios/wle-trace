import { getExistingServiceWorker } from './getExistingServiceWorker.js';
import { registerServiceWorker } from './registerServiceWorker.js';
import { type ServiceWorkerOptions } from '../types/ServiceWorkerOptions.js';
import { normalizeServiceWorkerPath } from './normalizeServiceWorkerPath.js';

export async function getServiceWorker(options?: ServiceWorkerOptions) {
    const serviceWorkerPath = options?.serviceWorkerPath ?? '/wle-trace-sw.js';
    const scope = options?.scope ?? '/';
    const timeoutMS = options?.timeoutMS ?? 10000;
    const normalizedServiceWorkerPath = normalizeServiceWorkerPath(serviceWorkerPath);

    // create service worker so that we can intercept .wasm files being
    // downloaded, and inject into them in the service worker
    let messagePort = await getExistingServiceWorker(normalizedServiceWorkerPath, scope, timeoutMS);
    if (!messagePort) {
        messagePort = await registerServiceWorker(normalizedServiceWorkerPath, scope, timeoutMS);
    }

    return messagePort;
}