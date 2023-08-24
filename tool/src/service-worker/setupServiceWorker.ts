import { SERVICE_WORKER_VERSION } from '../common/service-worker-bootstrap/SERVICE_WORKER_VERSION.js';

export function setupServiceWorker() {
    const sw = self as unknown as ServiceWorkerGlobalScope;
    sw.addEventListener('message', (ev) => {
        const msg = ev.data;
        if (msg !== null && typeof msg === 'object' && 'type' in msg) {
            if (msg.type === 'wle-trace-get-version') {
                ev.source!.postMessage({
                    type: 'wle-trace-version',
                    nonce: msg.nonce,
                    version: SERVICE_WORKER_VERSION
                });
            } else if (msg.type === 'wle-trace-add-injector-hook') {
                const injectionID = msg.injectionID;
                // TODO
            } else if (msg.type === 'wle-trace-cancel-injector-hook') {
                const injectionID = msg.injectionID;
                // TODO
            }
        }
    });
}