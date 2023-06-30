import { type WonderlandEngine } from '@wonderlandengine/api';
import { type AnyType, type ArgType, type MethodTypeMap, MAGIC, MAX_REPLAY_FORMAT_VERSION } from './replay/common.js';

export class WLETraceReplayer {
    replayVersion = 0;
    replayBuffer: null | Uint8Array = null;
    engine: WonderlandEngine | null = null;
    replayOffset = 0;
    stringDictionary = new Array<string>();
    callTypeMap: MethodTypeMap = new Map<number, ArgType[]>();
    callbackTypeMap: MethodTypeMap = new Map<number, AnyType[]>();

    _continueReplayV1() {
        const replayBuffer = this.replayBuffer!;
        const engine = this.engine!;

        const end = replayBuffer.byteLength;
        while (this.replayOffset < end) {
            const eventType = replayBuffer[this.replayOffset];
            // XXX don't inc replayOffset yet. we need to keep the offset if
            //     eventType is 0 (callback), because we are revisiting this
            //     event later

            if (eventType === 0 || eventType === 3) {
                // TODO handle no ret
                const tmp32 = new Uint32Array(1);
                const tmp8 = new Uint8Array(tmp32.buffer);
                tmp8.set(new Uint8Array(replayBuffer.buffer, this.replayOffset + 1, 4));
                const methodName = this.stringDictionary[tmp32[0]];
                console.debug('replay waiting for callback...', methodName);
                return; // callback, wait for a callback-as-replayed mark
            } else if (eventType === 1) {
                // wasm call
                this.replayOffset++;

                // parse method name
                const tmp32 = new Uint32Array(1);
                const tmp8 = new Uint8Array(tmp32.buffer);
                tmp8.set(new Uint8Array(replayBuffer.buffer, this.replayOffset, 4));
                const methodName = this.stringDictionary[tmp32[0]];
                this.replayOffset += 4;

                // parse arg count
                const argCount = replayBuffer[this.replayOffset];
                const args = new Array(argCount);
                this.replayOffset++;

                // parse number args
                const argBuf = new Float64Array(argCount);
                const argBuf8 = new Uint8Array(argBuf.buffer);
                const argBufLen = argCount * 8;
                argBuf8.set(new Uint8Array(replayBuffer.buffer, this.replayOffset, argBufLen));
                this.replayOffset += argBufLen;

                for (let i = 0; i < argCount; i++) {
                    args[i] = argBuf[i];
                }

                // do call
                console.debug('replay call', methodName);
                (engine.wasm as unknown as Record<string, (...args: any[]) => any>)[methodName](...args);
            } else if (eventType === 2) {
                // dma
                this.replayOffset++;

                const tmp32 = new Uint32Array(2);
                const tmp8 = new Uint8Array(tmp32.buffer);
                tmp8.set(new Uint8Array(replayBuffer.buffer, this.replayOffset, 8));
                this.replayOffset += 8;
                const byteOffset = tmp32[0];
                const byteLength = tmp32[1];
                console.debug('replay dma', byteLength, 'bytes @', byteOffset, ';end=', byteOffset + byteLength, '; heap8 end=', engine.wasm.HEAPU8.byteLength);
                engine.wasm.HEAPU8.set(new Uint8Array(replayBuffer.buffer, this.replayOffset, byteLength), byteOffset);
                this.replayOffset += byteLength;
            } else {
                debugger;
                throw new Error('unknown event type');
            }
        }

        if (this.replayOffset >= end) {
            // replay ended
            this.replayBuffer = null;
            this.stringDictionary.length = 0;
            console.debug('[wle-trace CONTROLLER] Replay ended');
        }
    }

    _continueReplay() {
        if (!this.replayBuffer || !this.engine) {
            return;
        }

        if (this.replayVersion === 1) {
            this._continueReplayV1();
        }
    }

    markWASMCallbackAsReplayed(methodName: string, _args: any[]) {
        if (!this.replayBuffer || !this.engine) {
            return;
        }

        const eventType = this.replayBuffer[this.replayOffset];
        this.replayOffset++;

        if (eventType !== 0) {
            debugger;
            throw new Error('Unexpected WASM callback; no callback expected');
        }

        // parse and verify method idx
        const methodIdx = this.stringDictionary.indexOf(methodName);

        // parse method name
        const tmp32 = new Uint32Array(1);
        const tmp8 = new Uint8Array(tmp32.buffer);
        tmp8.set(new Uint8Array(this.replayBuffer.buffer, this.replayOffset, 4));
        this.replayOffset += 4;

        if (methodIdx !== tmp32[0]) {
            debugger;
            throw new Error('Unexpected WASM callback; different method expected');
        }

        // parse arg count
        const argCount = this.replayBuffer[this.replayOffset];
        this.replayOffset++;

        // TODO verify args
        this.replayOffset += argCount * 8;

        this._continueReplay();
        // TODO if wasm expects a return value from the callback, return it here
    }

    _decodeMethodTypeMapV1(_methodTypeMap: MethodTypeMap) {
        // parse map size
        const tmp32 = new Uint32Array(1);
        const tmp8_32 = new Uint8Array(tmp32);

        // // method type map size
        // chunks.push(new Uint32Array([methodTypeMap.size]));

        // // method types
        // for (const [methodIdx, argTypes] of methodTypeMap) {
        //     chunks.push(new Uint32Array([ methodIdx, argTypes.length ]));
        //     chunks.push(new Uint8Array(argTypes));
        // }
        // TODO
    }

    startReplay(replayBuffer: Uint8Array) {
        if (this.replayBuffer) {
            throw new Error("Can't start replay; already replaying something");
        }

        if (!this.engine) {
            throw new Error("Can't start replay; engine not loaded");
        }

        // verify magic and get version
        const magicSize = MAGIC.byteLength;
        if (replayBuffer.byteLength < (magicSize + 2)) {
            throw new Error('Invalid demo file; too small');
        }

        const thisMagic = new Uint8Array(replayBuffer.buffer, 0, magicSize);
        for (let i = 0; i < magicSize; i++) {
            if (thisMagic[i] !== MAGIC[i]) {
                throw new Error('Invalid demo file; wrong magic number');
            }
        }

        const tmp8_16 = new Uint8Array([ replayBuffer[magicSize], replayBuffer[magicSize + 1] ]);
        const tmp16 = new Uint16Array(tmp8_16.buffer);
        const version = tmp16[0];
        if (version < 1 || version > MAX_REPLAY_FORMAT_VERSION) {
            throw new Error(`Invalid demo file; unsupported format version (got ${version}, supported range is 1:${MAX_REPLAY_FORMAT_VERSION})`);
        }

        // actually start parsing replay file
        console.debug(`[wle-trace CONTROLLER] Replay mode active. Loading WLE demo file with ${replayBuffer.byteLength} bytes`);
        this.replayVersion = version;
        this.replayBuffer = replayBuffer;
        this.replayOffset = 8;

        if (version === 1) {
            // parse dictionary
            this.stringDictionary.length = 0;
            const dictSize = (new Uint32Array(replayBuffer.buffer, this.replayOffset, 1))[0];
            const tmp32 = new Uint32Array(1);
            this.replayOffset += 4;
            const tmp8_32 = new Uint8Array(tmp32.buffer);
            const textDecoder = new TextDecoder();

            for (let i = 0; i < dictSize; i++) {
                tmp8_32.set(new Uint8Array(replayBuffer.buffer, this.replayOffset, 4));
                const strLen = tmp32[0];
                this.replayOffset += 4;
                this.stringDictionary.push(textDecoder.decode(new Uint8Array(replayBuffer.buffer, this.replayOffset, strLen)));
                this.replayOffset += strLen;
            }

            // parse call type map
            this.callTypeMap.clear();
            this._decodeMethodTypeMapV1(this.callTypeMap);

            // parse callback type map
            this.callbackTypeMap.clear();
            this._decodeMethodTypeMapV1(this.callbackTypeMap);
        }

        // actually start replay
        this._continueReplay();
    }

    startReplayFromUpload() {
        const fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.style.display = 'none';
        document.body.appendChild(fileIn);
        fileIn.addEventListener('change', async () => {
            const file = fileIn.files?.[0];
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                this.startReplay(new Uint8Array(arrayBuffer));
            }
        });

        fileIn.click();
        document.body.removeChild(fileIn);
    }

    startReplayFromUploadPopup() {
        const popup = document.createElement('button');
        popup.textContent = 'Click to upload replay file';
        popup.onclick = () => {
            this.startReplayFromUpload();
            document.body.removeChild(popup);
        };
        document.body.appendChild(popup);
    }
}