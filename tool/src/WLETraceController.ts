import { type TypedArray, type WonderlandEngine } from '@wonderlandengine/api';
import { triggerBreakpoint } from './utils/triggerBreakpoint.js';

export type FeatureToggleHandler = (id: string, isOn: boolean) => void;

enum ArgType {
    Undefined = 0,
    Null = 1,
    Number = 2,
    String = 3,
    Buffer = 4,
};

export class WLETraceController {
    features = new Map<string, boolean>();
    _featureToggleHandlers = new Map<string, Array<FeatureToggleHandler>>();
    queuedTraces = new Array<any[]>();
    maxQueuedTraces = 100;
    replayBuffer: ArrayBuffer[] = [];
    stringDictionary = new Array<string>();
    sentinelHandlers = new Array<() => void>();
    engine: WonderlandEngine | null = null;

    constructor(private recording = false) {
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

    _getStringIdx(str: string): number {
        let idx = this.stringDictionary.indexOf(str);
        if (idx < 0) {
            idx = this.stringDictionary.length;
            this.stringDictionary.push(str);
        }

        return idx;
    }

    _recordWASMGeneric(isCall: boolean, methodName: string, args: any[]) {
        if (!this.recording) {
            return;
        }

        // get index of method name
        const methodIdx = this._getStringIdx(methodName);

        // prepare header of method call(back). format:
        // bytes; desc
        // -----------
        // 1    ; eventType (0 if callback, 1 if call, 2 if dma (not used here))
        // 4    ; methodIdx
        // 1    ; argCount
        const argCount = args.length;
        const headerBuffer = new ArrayBuffer(6);
        const headerView8 = new Uint8Array(headerBuffer);
        const headerViewMethodIdx = new Uint32Array(headerBuffer, 0, 1);

        // XXX temporarily write the 32-bit uint to the beginning, but then
        //     shift right by 1 byte (we can only have offsets multiple of 4 for
        //     uint32)
        headerViewMethodIdx[0] = methodIdx;
        headerView8[4] = headerView8[3];
        headerView8[3] = headerView8[2];
        headerView8[2] = headerView8[1];
        headerView8[1] = headerView8[0];

        headerView8[0] = isCall ? 1 : 0;
        headerView8[5] = argCount;

        this.replayBuffer.push(headerBuffer);

        // encode arguments
        const argsBuffer = new Float64Array(argCount);
        this.replayBuffer.push(argsBuffer);

        for (let i = 0; i < argCount; i++) {
            const arg = args[i];
            if (typeof arg !== 'number') {
                debugger;
                throw new Error('Unexpected non-number argument in WASM call');
            }

            argsBuffer[i] = arg;
        }
    }

    recordWASMCall(methodName: string, args: any[]) {
        this._recordWASMGeneric(true, methodName, args);
    }

    recordWASMCallback(methodName: string, args: any[]) {
        this._recordWASMGeneric(false, methodName, args);
    }

    recordWASMDMA(dst: ArrayBuffer | TypedArray, src: ArrayBuffer | TypedArray, offset: number) {
        if (!this.recording || this.engine === null) {
            return;
        }

        // verify that destination is the heap
        let byteLength = Math.min(src.byteLength, dst.byteLength - offset);
        if (ArrayBuffer.isView(dst)) {
            offset += dst.byteOffset;
            dst = dst.buffer;
        }

        if (byteLength <= 0 || dst !== this.engine.wasm.HEAP8?.buffer) {
            return;
        }

        // prepare header of dma set. format:
        // bytes; desc
        // -----------
        // 1    ; eventType (0 if callback (not used here), 1 if call (not used here), 2 if dma)
        // 4    ; offset
        // 4    ; buffer length
        this.replayBuffer.push(new Uint8Array([ 2 ]));
        this.replayBuffer.push(new Uint8Array([ offset, src.byteLength ]));

        // add buffer to replay buffer
        const srcCopy = new Uint8Array(byteLength);
        if (ArrayBuffer.isView(src)) {
            srcCopy.set(src);
        } else {
            srcCopy.set(new Uint8Array(src, 0, byteLength));
        }

        this.replayBuffer.push(srcCopy);
    }

    stopRecording(): Blob {
        if (!this.recording) {
            throw new Error("Can't stop recording; not recording");
        }

        this.recording = false;

        console.debug('[wle-trace CONTROLLER] recording stopped');

        const chunks: ArrayBuffer[] = [];
        const textEncoder = new TextEncoder();

        chunks.push(new Uint32Array([ this.stringDictionary.length ]));
        for (const str of this.stringDictionary) {
            const strBuf = textEncoder.encode(str);
            chunks.push(new Uint32Array([ strBuf.byteLength ]));
            chunks.push(strBuf);
        }

        chunks.push(...this.replayBuffer);
        this.stringDictionary.length = 0;
        this.replayBuffer.length = 0;

        return new Blob(chunks);
    }

    stopRecordingAndDownload() {
        const blob = this.stopRecording();

        const blobURL = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobURL;
        link.download = `wle-trace-recording-${Date.now()}.bin`;
        link.click();
        window.URL.revokeObjectURL(blobURL);
    }

    addSentinelHandler(callback: () => void) {
        this.sentinelHandlers.push(callback);
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

        for (const handler of this.sentinelHandlers) {
            try {
                handler();
            } catch(err) {
                console.error('[wle-trace CONTROLLER] uncaught exception is user-defined sentinel handler');
            }
        }

        triggerBreakpoint(this, 'sentinel');
    }
}
