import { WASM, WonderlandEngine } from '@wonderlandengine/api';
import { type ReplayBuffer } from './ReplayBuffer.js';
import { ReplayBufferV1 } from './ReplayBufferV1.js';
import { type WLETraceEarlyInjector } from '../common/WLETraceEarlyInjector.js';
import { immediatelyInjectWonderlandEngineReplayer } from './hooks/WonderlandEngine.js';
import { injectWASMReplayer } from './hooks/WASM.js';
import { badVersionErr } from '../common/inject/badVersionErr.js';
import { MAGIC } from '../common/magic.js';

class DummyEmitter {
    notify() {}
}

class DummyScene {
    onPreRender = new DummyEmitter();
    onPostRender = new DummyEmitter();

    load(_src: string) {}
}

export type EndedCallback = (isError: boolean, err?: unknown) => void;

export class WLETraceReplayer implements ReplayBuffer, WLETraceEarlyInjector {
    private _wasm: WASM | null = null;
    private replayBuffer: ReplayBuffer | null = null;
    private _ready: Array<[() => void, (err: unknown) => void]> | boolean = [];
    private _endedCallbacks = new Array<EndedCallback>();

    constructor(wasmData: ArrayBuffer, jsData: ArrayBuffer, loadingScreenData: ArrayBuffer, canvasID?: string) {
        this.inject();
        this.loadRuntime(wasmData, jsData, loadingScreenData, canvasID);
    }

    waitForReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._ready === true) {
                resolve();
            } else if (this._ready === false) {
                reject(new Error('Error occurred while injecting early hooks. Check console for details'));
            } else {
                this._ready.push([resolve, reject]);
            }
        });
    }

    private async inject() {
        try {
            await injectWASMReplayer(this);
        } catch (err) {
            if (Array.isArray(this._ready)) {
                for (const [_resolve, reject] of this._ready) {
                    reject(err);
                }
            }

            this._ready = false;
            return;
        }

        console.debug('[wle-trace REPLAYER] Late init hook called; recorder is ready for a demo file');

        if (Array.isArray(this._ready)) {
            for (const [resolve, _reject] of this._ready) {
                resolve();
            }
        }

        this._ready = true;
    }

    private async loadRuntime(wasmData: ArrayBuffer, jsData: ArrayBuffer, loadingScreenData: ArrayBuffer, canvasID?: string) {
        const jsTextData = new TextDecoder().decode(jsData);

        const canvas = canvasID ?? 'canvas';
        const glCanvas = document.getElementById(canvas);
        if (!glCanvas) {
            throw new Error(`loadRuntime(): Failed to find canvas with id '${canvas}'`);
        }
        if (!(glCanvas instanceof HTMLCanvasElement)) {
            throw new Error(`loadRuntime(): HTML element '${canvas}' must be a canvas`);
        }

        const wasm = new WASM(false);
        const wasmRO = wasm as {
            wasm: ArrayBuffer,
            canvas: HTMLCanvasElement,
        };

        wasmRO.wasm = wasmData;
        wasmRO.canvas = glCanvas;

        Object.defineProperty(wasm, 'worker', {
            get() {
                throw new Error('You are trying to load a threaded runtime file, which is not supported by wle-trace yet. Please re-record the demo file in a single-threaded runtime');
            },
        })

        const engine = new WonderlandEngine(wasm, loadingScreenData);
        (engine as unknown as { scene: DummyScene }).scene = new DummyScene();

        (0, eval)(jsTextData);
        const loader = (window as unknown as { instantiateWonderlandRuntime: (wasm: WASM) => Promise<void> }).instantiateWonderlandRuntime;

        if (loader === undefined) {
            throw new Error(`JavaScript runtime file did not result in a runtime loader being defined. Is this the right file? ${badVersionErr}`);
        }

        (window as unknown as { instantiateWonderlandRuntime: unknown }).instantiateWonderlandRuntime = undefined;

        await loader(wasm);
    }

    get ended(): boolean {
        return this.replayBuffer === null || this.replayBuffer.ended;
    }

    get replaying(): boolean {
        return this.replayBuffer !== null;
    }

    start(buffer: ArrayBuffer) {
        if (this.replayBuffer) {
            throw new Error("Can't start replay; already replaying something");
        }

        if (!this._wasm) {
            throw new Error("Can't start replay; engine not loaded");
        }

        // verify magic and get version
        const magicSize = MAGIC.byteLength;
        if (buffer.byteLength < (magicSize + 2)) {
            throw new Error('Invalid demo file; too small');
        }

        const thisMagic = new Uint8Array(buffer, 0, magicSize);
        for (let i = 0; i < magicSize; i++) {
            if (thisMagic[i] !== MAGIC[i]) {
                throw new Error('Invalid demo file; wrong magic number');
            }
        }

        const bufferView = new DataView(buffer);
        const version = bufferView.getUint16(magicSize);

        // actually start parsing replay file with correct parser, or complain
        // about invalid versions
        if (version === 1) {
            this.replayBuffer = new ReplayBufferV1(this._wasm, buffer, magicSize + 2);
        } else {
            throw new Error(`Invalid demo file; unsupported format version (${version})`);
        }

        // start replay
        console.debug(`[wle-trace REPLAYER] Replay mode active. Loaded WLE demo file with ${buffer.byteLength} bytes`);
        this.continue();
    }

    get wasm(): WASM | null {
        return this._wasm;
    }

    set wasm(wasm: WASM) {
        if (this._wasm) {
            throw new Error('WASM instance already set; are you reusing a replayer?');
        }

        this._wasm = wasm;
        immediatelyInjectWonderlandEngineReplayer(this);
    }

    markCallbackAsReplayed(methodName: string, args: unknown[]): unknown {
        if (this.replayBuffer) {
            let retVal;
            try {
                retVal = this.replayBuffer.markCallbackAsReplayed(methodName, args);
            } catch (err) {
                console.error('[wle-trace REPLAYER] Exception occurred while marking callback as replayed, replay will be stopped');
                this.disposeReplayBuffer(true, err);
                throw err;
            }

            if (this.replayBuffer.ended) {
                this.disposeReplayBuffer();
            }

            return retVal;
        } else {
            console.warn('[wle-trace REPLAYER] callback ignored; not replaying');
            return;
        }
    }

    continue(): boolean {
        if (this.replayBuffer) {
            let canContinue;

            try {
                canContinue = this.replayBuffer.continue();
            } catch (err) {
                console.error('[wle-trace REPLAYER] Exception occurred while continuing playback, replay will be stopped');
                this.disposeReplayBuffer(true, err);
                throw err;
            }

            if (canContinue) {
                return true;
            } else {
                this.disposeReplayBuffer();
                return false;
            }
        } else {
            return false;
        }
    }

    private disposeReplayBuffer() {
        if (!this.replayBuffer) {
            throw new Error('Already disposed or not initialized');
        }

        console.debug('[wle-trace REPLAYER] Replay ended');
        this.replayBuffer = null;
    }

    onEnded(callback: EndedCallback): void {
        this._endedCallbacks.push(callback);
    }
}