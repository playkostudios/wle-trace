import { loadRuntime } from '@wonderlandengine/api';
import { type ServiceWorkerOptions } from './types/ServiceWorkerOptions.js';
import { getServiceWorker } from './service-worker-bootstrap/getServiceWorker.js';
import { assertServiceWorkerSupported } from './service-worker-bootstrap/assertServiceWorkerSupported.js';

export type InjectionCallback = () => void;
type PendingWorkers = Array<[(sw: ServiceWorker) => void, (err: unknown) => void]>;

export class WLETraceSWInjector {
    private nextInjectionID = 0;
    private pendingInjections = new Map<number, InjectionCallback>();
    private serviceWorker: ServiceWorker | null | false | PendingWorkers = null;

    waitForServiceWorker(options?: ServiceWorkerOptions) {
        return new Promise<ServiceWorker>((resolve, reject) => {
            if (Array.isArray(this.serviceWorker)) {
                // already loading
                this.serviceWorker.push([resolve, reject]);
            } else if (this.serviceWorker === false) {
                // already failed to load
                reject(new Error('Service worker failed to initialize previously'));
            } else if (this.serviceWorker === null) {
                // need to load
                this.serviceWorker = [[resolve, reject]];

                getServiceWorker(options).then((serviceWorker) => {
                    for (const [resolveOther, _] of this.serviceWorker as PendingWorkers) {
                        try {
                            resolveOther(serviceWorker);
                        } catch(_) {}
                    }

                    this.serviceWorker = serviceWorker;
                }).catch((err) => {
                    for (const [_, rejectOther] of this.serviceWorker as PendingWorkers) {
                        try {
                            rejectOther(err);
                        } catch(_) {}
                    }

                    this.serviceWorker = null;
                });
            } else {
                // already loaded
                console.warn('Reusing service worker, may have different options');
                resolve(this.serviceWorker);
            }
        });
    }

    async makeLoadRuntimeWrapper(injectionCallback: InjectionCallback, swOptions?: ServiceWorkerOptions): Promise<typeof loadRuntime> {
        assertServiceWorkerSupported();
        const serviceWorker = await this.waitForServiceWorker(swOptions);

        return async (...loadRuntimeArgs: Parameters<typeof loadRuntime>) => {
            const injectionID = this.nextInjectionID++;

            let injected = false;
            const injectionCallbackWrapper = () => {
                injectionCallback();
                injected = true;
            }

            this.pendingInjections.set(injectionID, injectionCallbackWrapper);
            serviceWorker.postMessage({
                type: 'wle-trace-add-injector-hook',
                injectionID,
            });

            try {
                const engine = await loadRuntime(...loadRuntimeArgs);

                if (!injected) {
                    throw new Error('Runtime successfully loaded, but injector was not called');
                }

                return engine;
            } finally {
                this.pendingInjections.delete(injectionID);
                serviceWorker.postMessage({
                    type: 'wle-trace-cancel-injector-hook',
                    injectionID,
                });
            }
        }
    }

    doInjection(injectionID: number) {
        const injectionCallback = this.pendingInjections.get(injectionID);
        if (injectionCallback) {
            injectionCallback();
        } else {
            throw new Error('Invalid injection ID');
        }
    }
}

export function getGlobalSWInjector() {
    if ('wleTraceSWInjector' in window) {
        return window.wleTraceSWInjector as WLETraceSWInjector;
    } else {
        return (window as unknown as { wleTraceSWInjector: WLETraceSWInjector }).wleTraceSWInjector = new WLETraceSWInjector();
    }
}