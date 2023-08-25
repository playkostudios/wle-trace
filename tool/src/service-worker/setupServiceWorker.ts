import { SERVICE_WORKER_VERSION } from '../common/service-worker-bootstrap/SERVICE_WORKER_VERSION.js';
import { replaceResponse } from './replaceResponse.js';

const pendingInjectors = new Array<[ injectionID: number, clientID: string, runtime: string ]>();

function handlePortMessages(client: Client, workerPort: MessagePort) {
    workerPort.onmessage = (ev) => {
        const msg = ev.data;
        if (msg.type === 'add-injector-hook') {
            pendingInjectors.push([ msg.injectionID, client.id, msg.runtime ]);
        } else if (msg.type === 'cancel-injector-hook') {
            for (let i = pendingInjectors.length - 1; i >= 0; i--) {
                const [injectionID, clientID] = pendingInjectors[i];
                if (msg.injectionID === injectionID && client.id === clientID) {
                    pendingInjectors.splice(i, 1);
                    break;
                }
            }
        } else if (msg.type === 'dispose') {
            for (let i = pendingInjectors.length - 1; i >= 0; i--) {
                if (client.id === pendingInjectors[i][1]) {
                    pendingInjectors.splice(i, 1);
                }

                workerPort.onmessage = null;
                workerPort.close();
            }
        }
    };
}

export function setupServiceWorker() {
    const sw = self as unknown as ServiceWorkerGlobalScope;
    sw.addEventListener('message', (ev) => {
        const msg = ev.data;
        const ports = ev.ports;
        const source = ev.source;

        if (!(source && source instanceof Client)) {
            return;
        }

        let workerPort: MessagePort;
        if (ports.length === 1) {
            workerPort = ports[0];
        } else {
            return;
        }

        if (msg !== null && (typeof msg === 'object') && msg.type === 'wle-trace-init') {
            handlePortMessages(source, workerPort);

            workerPort.postMessage({
                type: 'wle-trace-ready',
                nonce: msg.nonce,
                version: SERVICE_WORKER_VERSION,
            });
        }
    });

    sw.addEventListener('fetch', (ev) => {
        const req = ev.request;
        const url = req.url;
        if (!url.endsWith('.js')) {
            return;
        }

        let i = 0;
        const iMax = pendingInjectors.length;
        let injectionID!: number;
        for (; i < iMax; i++) {
            const [otherInjectionID, clientID, runtime] = pendingInjectors[i];
            if (ev.clientId === clientID && url.indexOf(runtime) !== -1) {
                injectionID = otherInjectionID;
                break;
            }
        }

        if (i === iMax) {
            return;
        }

        pendingInjectors.splice(i, 1);

        // this is the engine bootstrap. try to add injector hook into it right
        // after the wasm module is initialized... but first we need to download
        ev.respondWith(replaceResponse(req, injectionID));
    });

    sw.addEventListener('activate', (ev) => {
        ev.waitUntil(sw.clients.claim());
    });
}