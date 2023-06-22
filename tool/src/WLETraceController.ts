import { triggerBreakpoint } from './utils/triggerBreakpoint.js';

export type FeatureToggleHandler = (id: string, isOn: boolean) => void;

export class WLETraceController {
    features = new Map<string, boolean>();
    _featureToggleHandlers = new Map<string, Array<FeatureToggleHandler>>();
    queuedTraces = new Array<any[]>();
    maxQueuedTraces = 100;
    replayBuffer = new Array<Uint8Array>();

    constructor() {
        // -- common features --
        // StyledMessage
        this.registerFeature('fast-trace');
        this.registerFeature('fast-objects');
        // sentinel
        this.registerFeature('breakpoint:sentinel');

        // -- other stuff --
        // setup sentinel
        window.addEventListener('error', () => {
            this.triggerSentinel('uncaught exception');
        });
    }

    registerFeature(id: string) {
        this.features.set(id, false);
    }

    isEnabled(id: string) {
        return this.features.get(id);
    }

    toggle(id: string, on: boolean | null = null) {
        const isOn = this.features.get(id);
        if (isOn === undefined) {
            console.debug(`[wle-trace CONTROLLER] Ignored unknown feature "${id}"`);
            return null;
        }

        if (on === null) {
            on = !isOn;
        } else if (on === isOn) {
            console.debug(`[wle-trace CONTROLLER] Feature "${id}" is already ${isOn ? 'on' : 'off'}`);
            return isOn;
        }

        this.features.set(id, !isOn);

        console.debug(`[wle-trace CONTROLLER] Toggled feature "${id}" (is now ${isOn ? 'off' : 'on'})`);

        const handlers = this._featureToggleHandlers.get(id);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(id, isOn);
                } catch(err) {
                    console.error(`[wle-trace CONTROLLER] Unhandled exception in feature toggle handler:`, err);
                }
            }
        }
        return !isOn;
    }

    enable(id: string) {
        this.toggle(id, true);
    }

    disable(id: string) {
        this.toggle(id, false);
    }

    toggleAll(on: boolean | null = null) {
        for (const id of this.features.keys()) {
            this.toggle(id, on);
        }
    }

    enableAll() {
        this.toggleAll(true);
    }

    disableAll() {
        this.toggleAll(false);
    }

    toggleWithPrefix(prefix: string, on: boolean | null = null) {
        for (const id of this.features.keys()) {
            if (typeof id === 'string' && id.startsWith(prefix)) {
                this.toggle(id, on);
            }
        }
    }

    enableWithPrefix(prefix: string) {
        this.toggleWithPrefix(prefix, true);
    }

    disableWithPrefix(prefix: string) {
        this.toggleWithPrefix(prefix, false);
    }

    list() {
        for (const [id, isOn] of this.features) {
            console.debug(`[wle-trace CONTROLLER] - "${id}": ${isOn ? 'on' : 'off'}`);
        }
    }

    guardFunction(id: string, func: Function, register = true) {
        if (register) {
            this.registerFeature(id);
        }

        const thisController = this;
        return function(this: any, ...args: any[]) {
            if (thisController.isEnabled(id)) {
                func.apply(this, args);
            }
        }
    }

    handleFeatureToggle(id: string, callback: FeatureToggleHandler) {
        let handlers = this._featureToggleHandlers.get(id);

        if (handlers) {
            handlers.push(callback);
        } else {
            handlers = [callback];
            this._featureToggleHandlers.set(id, handlers);
        }
    }

    bindFunc<A extends any[], R>(callback: (controller: WLETraceController, ...args: A) => R): (...args: A) => R {
        return callback.bind(null, this);
    }

    queueTrace(argumentParts: any[]) {
        this.queuedTraces.push(argumentParts);

        const queuedTraceCount = this.queuedTraces.length;
        if (queuedTraceCount > this.maxQueuedTraces) {
            const toRemove = queuedTraceCount - this.maxQueuedTraces;
            this.queuedTraces.splice(0, toRemove);
        }
    }

    clearTraceQueue() {
        this.queuedTraces.length = 0;
    }

    recordWASMCall(_methodName: string, ..._args: any[]) {
        // TODO
    }

    triggerSentinel(reason = 'triggered manually by user') {
        console.error(`[wle-trace CONTROLLER] sentinel triggered. reason: ${reason}`);

        const queuedTraceCount = this.queuedTraces.length;
        if (queuedTraceCount > 0) {
            console.debug(`[wle-trace CONTROLLER] flushing ${queuedTraceCount} queued trace message${queuedTraceCount > 1 ? 's (oldest at top, newest at bottom)' : ''}:`);

            for (const argumentParts of this.queuedTraces) {
                console.debug(...argumentParts);
            }

            this.clearTraceQueue();
        }

        if (this.replayBuffer.length !== 0) {
            // TODO download replay buffer

            this.replayBuffer.length = 0;
        }

        triggerBreakpoint(this, 'sentinel');
    }
}
