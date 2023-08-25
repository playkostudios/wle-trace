import { LoadRuntimeOptions, loadRuntime } from '@wonderlandengine/api';
import { type ServiceWorkerOptions } from './types/ServiceWorkerOptions.js';
import { getServiceWorker } from './service-worker-bootstrap/getServiceWorker.js';
import { assertServiceWorkerSupported } from './service-worker-bootstrap/assertServiceWorkerSupported.js';

export type PreInjectorCallback = (context: InjectorContext) => void;
export type PostInjectorCallback = (instance: WebAssembly.WebAssemblyInstantiatedSource, context: InjectorContext) => void;
type InjectorContext = Record<string, unknown>;
type PendingMessagePorts = Array<[(sw: MessagePort) => void, (err: unknown) => void]>;

export class WLETraceSWInjector {
    private nextInjectionID = 0;
    private pendingInjectors = new Map<number, [pre: PreInjectorCallback, post: PostInjectorCallback]>();
    private messagePort: MessagePort | null | false | PendingMessagePorts = null;

    constructor() {
        window.addEventListener('unload', () => {
            const port = this.messagePort;
            if (port && !Array.isArray(port)) {
                port.postMessage({
                    type: 'dispose',
                });
                port.close();
                this.messagePort = null;
            }
        });
    }

    waitForServiceWorker(options?: ServiceWorkerOptions) {
        return new Promise<MessagePort>((resolve, reject) => {
            if (Array.isArray(this.messagePort)) {
                // already loading
                this.messagePort.push([resolve, reject]);
            } else if (this.messagePort === false) {
                // already failed to load
                reject(new Error('Service worker failed to initialize previously'));
            } else if (this.messagePort === null) {
                // need to load
                this.messagePort = [[resolve, reject]];

                getServiceWorker(options).then((messagePort) => {
                    for (const [resolveOther, _] of this.messagePort as PendingMessagePorts) {
                        try {
                            resolveOther(messagePort);
                        } catch(_) {}
                    }

                    // XXX if response messages are needed:
                    // messagePort.onmessage = (ev) => {
                    //     const msg = ev.data;
                    //     switch(msg.type) {
                    //
                    //     }
                    // };

                    this.messagePort = messagePort;
                }).catch((err) => {
                    for (const [_, rejectOther] of this.messagePort as PendingMessagePorts) {
                        try {
                            rejectOther(err);
                        } catch(_) {}
                    }

                    this.messagePort = null;
                });
            } else {
                // already loaded
                console.warn('Reusing service worker, may have different options');
                resolve(this.messagePort);
            }
        });
    }

    async makeLoadRuntimeWrapper(preInjectorCallback: PreInjectorCallback, postInjectorCallback: PostInjectorCallback, swOptions?: ServiceWorkerOptions): Promise<typeof loadRuntime> {
        assertServiceWorkerSupported();
        const messagePort = await this.waitForServiceWorker(swOptions);

        return async (runtime: string, options?: Partial<LoadRuntimeOptions>) => {
            const injectionID = this.nextInjectionID++;

            let injectedPre = false;
            const preInjectorCallbackWrapper = (...args: Parameters<PreInjectorCallback>) => {
                preInjectorCallback(...args);
                injectedPre = true;
            }

            let injectedPost = false;
            const postInjectorCallbackWrapper = (...args: Parameters<PostInjectorCallback>) => {
                postInjectorCallback(...args);
                injectedPost = true;
            }

            this.pendingInjectors.set(injectionID, [preInjectorCallbackWrapper, postInjectorCallbackWrapper]);
            console.debug('::: send wle-trace-add-injector-hook')
            messagePort.postMessage({
                type: 'add-injector-hook',
                injectionID,
                runtime,
            });

            try {
                const engine = await loadRuntime(runtime, options);

                if (!injectedPre) {
                    throw new Error('Runtime successfully loaded, but pre-injector (stage 2) was not called');
                }
                if (!injectedPost) {
                    throw new Error('Runtime successfully loaded, but post-injector (stage 3) was not called');
                }

                return engine;
            } finally {
                this.pendingInjectors.delete(injectionID);
                console.debug('::: send wle-trace-cancel-injector-hook')
                messagePort.postMessage({
                    type: 'cancel-injector-hook',
                    injectionID,
                });
            }
        }
    }

    doPreInjection(injectionID: number, context: InjectorContext) {
        const injectors = this.pendingInjectors.get(injectionID);
        if (injectors) {
            injectors[0](context);
        } else {
            throw new Error('Invalid injection ID');
        }
    }

    doPostInjection(injectionID: number, instance: WebAssembly.WebAssemblyInstantiatedSource, context: InjectorContext) {
        const injectors = this.pendingInjectors.get(injectionID);
        if (injectors) {
            injectors[1](instance, context);
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