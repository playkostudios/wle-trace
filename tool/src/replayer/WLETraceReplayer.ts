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

export class WLETraceReplayer implements WLETraceEarlyInjector {
    private _wasm: WASM | null = null;
    private replayBuffer: ReplayBuffer | null = null;
    private _ready: Array<[() => void, (err: unknown) => void]> | boolean = [];
    private _endedCallbacks = new Array<EndedCallback>();
    private _replayBufferFactory: null | (() => ReplayBuffer) = null;
    private looseEndResolve: null | (() => void) = null;
    private warnedIgnored = false;

    constructor(demoBuffer: ArrayBuffer, wasmData: ArrayBuffer, jsData: ArrayBuffer, loadingScreenData: ArrayBuffer, canvasID?: string) {
        // verify magic and get version
        const magicSize = MAGIC.byteLength;
        if (demoBuffer.byteLength < (magicSize + 2)) {
            throw new Error('Invalid demo file; too small');
        }

        const thisMagic = new Uint8Array(demoBuffer, 0, magicSize);
        for (let i = 0; i < magicSize; i++) {
            if (thisMagic[i] !== MAGIC[i]) {
                throw new Error('Invalid demo file; wrong magic number');
            }
        }

        const bufferView = new DataView(demoBuffer);
        const version = bufferView.getUint16(magicSize);

        // make factory for correct replay buffer parser
        if (version === 1) {
            this._replayBufferFactory = () => {
                return new ReplayBufferV1(this._wasm!, demoBuffer, magicSize + 2);
            };
        } else {
            throw new Error(`Invalid demo file; unsupported format version (${version})`);
        }

        // load engine replay
        console.debug(`[wle-trace REPLAYER] Loaded WLE demo file with ${demoBuffer.byteLength} bytes. Waiting for engine to initialize...`);
        this.inject((_wasm) => {});
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

    private loadFail(err: unknown) {
        if (Array.isArray(this._ready)) {
            for (const [_resolve, reject] of this._ready) {
                reject(err);
            }
        }

        this._ready = false;
    }

    private async inject(callback: (wasm: WASM) => void) {
        try {
            await injectWASMReplayer(this, callback);
        } catch (err) {
            this.loadFail(err);
            return;
        }
    }

    private async loadRuntime(wasmData: ArrayBuffer, jsData: ArrayBuffer, loadingScreenData: ArrayBuffer, canvasID?: string) {
        setTimeout(() => {
            if (this._ready !== true) {
                this.loadFail(new Error('Runtime loader timed out'));
            }
        }, 10000);

        try {
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
        } catch(err) {
            this.loadFail(err);
        }
    }

    get ended(): boolean {
        return this.replayBuffer === null || this.replayBuffer.ended;
    }

    get wasm(): WASM | null {
        return this._wasm;
    }

    set wasm(wasm: WASM) {
        if (this._wasm) {
            throw new Error('WASM instance already set; are you reusing a replayer?');
        }

        if (!this._replayBufferFactory) {
            throw new Error('Replay buffer factory not ready; are you reusing a replayer?');
        }

        this._wasm = wasm;
        immediatelyInjectWonderlandEngineReplayer(this);

        console.debug('[wle-trace REPLAYER] Early init hook called; recorder is ready to play demo file');

        if (Array.isArray(this._ready)) {
            for (const [resolve, _reject] of this._ready) {
                resolve();
            }
        }

        this._ready = true;

        const factory = this._replayBufferFactory;
        this._replayBufferFactory = null;
        this.replayBuffer = factory();
        this.start();
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

            return retVal;
        } else {
            if (!this.warnedIgnored) {
                console.warn('[wle-trace REPLAYER] callback ignored; not replaying - this warning will not be shown again');
                this.warnedIgnored = true;
            }

            return;
        }
    }

    private waitForLooseEnd(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.looseEndResolve) {
                reject(new Error('Already waiting for a loose end'));
            } else {
                this.looseEndResolve = resolve;
            }
        });
    }

    private async start(): Promise<void> {
        if (!this.replayBuffer) {
            throw new Error('Replay buffer not set');
        }

        this.replayBuffer.registerLooseEndCallback(() => {
            console.debug('!!! loose end')
            const resolve = this.looseEndResolve;

            if (resolve) {
                resolve();
                this.looseEndResolve = null;
            } else {
                console.error('[wle-trace REPLAYER] Loose end detected, but replayer is not waiting for it, replay will be stopped');
                this.disposeReplayBuffer(true, new Error('Loose end detected, but replayer is not waiting for it'));
            }
        })

        while (true) {
            let canContinue;

            try {
                console.debug('continuing...')
                canContinue = this.replayBuffer.continue();
            } catch (err) {
                console.error('[wle-trace REPLAYER] Exception occurred while continuing playback, replay will be stopped');
                this.disposeReplayBuffer(true, err);
                throw err;
            }

            if (canContinue) {
                console.debug('waiting for loose end...')
                await this.waitForLooseEnd();

                if (this.replayBuffer.ended) {
                    this.disposeReplayBuffer();
                    return;
                }
            } else {
                this.disposeReplayBuffer();
                return;
            }
        }
    }

    private disposeReplayBuffer(isError = false, err?: unknown) {
        if (!this.replayBuffer) {
            throw new Error('Already disposed or not initialized');
        }

        console.debug('[wle-trace REPLAYER] Replay ended');
        this.replayBuffer = null;

        for (const callback of this._endedCallbacks) {
            callback(isError, err);
        }
    }

    onEnded(callback: EndedCallback): void {
        this._endedCallbacks.push(callback);
    }
}