import { type TypedArray, type WonderlandEngine } from '@wonderlandengine/api';
import { triggerBreakpoint } from './utils/triggerBreakpoint.js';

export type FeatureToggleHandler = (id: string, isOn: boolean) => void;

export enum ValueType {
    Uint32 = 0,
    Int32 = 1,
    Float32 = 2,
    Float64 = 3,
    Pointer = 4,
    Boolean = 5,
    String = 6,
};

export enum SpecialRetType {
    Void = 255,
};

export type ArgType = ValueType;
export type RetType = SpecialRetType | ValueType;
export type AnyType = ArgType | RetType;
export type MethodTypeMap = Map<number, AnyType[]>;

export enum ValueTypeJSON {
    Uint32 = 'u32',
    Int32 = 'i32',
    Float32 = 'f32',
    Float64 = 'f64',
    Pointer = 'ptr',
    Boolean = 'bool',
    String = 'str',
}

export interface CallTypeJSON {
    args: Array<ValueTypeJSON>;
    ret?: ValueTypeJSON;
};

export interface MethodTypeMapsJSON {
    version: 1;
    calls?: Record<string, CallTypeJSON>;
    callbacks?: Record<string, CallTypeJSON>;
};

// 0x00DF"WLET" in ASCII; Demo File WLE-Trace
const MAGIC = new Uint8Array([ 0x00,0xDF,0x57,0x4C,0x45,0x54 ]);
const REPLAY_FORMAT_VERSION = 1;
const MAX_REPLAY_FORMAT_VERSION = 1;

export class WLETraceController {
    features = new Map<string, boolean>();
    _featureToggleHandlers = new Map<string, Array<FeatureToggleHandler>>();
    queuedTraces = new Array<any[]>();
    maxQueuedTraces = 100;
    replayVersion = 0;
    recordBuffer: null | ArrayBuffer[] = null;
    replayBuffer: null | Uint8Array = null;
    stringDictionary = new Array<string>();
    sentinelHandlers = new Array<() => void>();
    engine: WonderlandEngine | null = null;
    replayOffset = 0;
    callTypeMap: MethodTypeMap = new Map<number, ArgType[]>();
    callbackTypeMap: MethodTypeMap = new Map<number, AnyType[]>();

    constructor(recording = false) {
        if (recording) {
            this.recordBuffer = [];
        }

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

    _recordValue(val: unknown, expectedType: AnyType) {
        let enc;
        const valType = typeof val;
        if (expectedType === SpecialRetType.Void) {
            if (val !== undefined) {
                console.warn(`[wle-trace] ignoring value; void expected, but got a non-undefined value`);
            }

            return;
        } else if (expectedType === ValueType.Boolean) {
            if (valType !== 'boolean') {
                console.warn(`[wle-trace] casting value to boolean; boolean expected`);
            }

            enc = new Uint8Array([ val ? 1 : 0 ]);
        } else if (expectedType === ValueType.Uint32 || expectedType === ValueType.Int32 || expectedType === ValueType.Float32 || expectedType === ValueType.Float64 || expectedType === ValueType.Pointer) {
            if (valType !== 'number') {
                if (expectedType === ValueType.Pointer && val === null) {
                    val = 0;
                } else {
                    if (val === undefined || val === null) {
                        val = 0;
                    } else if (valType === 'boolean') {
                        val = val ? 1 : 0;
                    } else {
                        throw new Error('Impossible cast to number');
                    }

                    console.warn(`[wle-trace] casting value to number; number expected`);
                }
            }

            if (expectedType === ValueType.Uint32 || expectedType === ValueType.Pointer) {
                enc = new Uint32Array([ val as number ]);
            } else if (expectedType === ValueType.Int32) {
                enc = new Int32Array([ val as number ]);
            } else if (expectedType === ValueType.Float32) {
                enc = new Float32Array([ val as number ]);
            } else {
                enc = new Float64Array([ val as number ]);
            }
        } else if (expectedType === ValueType.String) {
            if (valType !== 'string') {
                val = String(val);
                console.warn(`[wle-trace] casting value to string; string expected`);
            }

            enc = new Uint32Array([ this._getStringIdx(val as string) ]);
        } else {
            throw new Error('Invalid expected type');
        }

        this.recordBuffer!.push(enc);
    }

    recordWASMGeneric(isCall: boolean, methodName: string, args: any[], threw: boolean, retVal?: any) {
        if (!this.recordBuffer || this.engine === null) {
            return;
        }

        // console.debug(`record call${isCall ? '' : 'back'}`, methodName);

        // get index of method name
        const methodIdx = this._getStringIdx(methodName);

        // prepare header of method call(back). format:
        // bytes; desc
        // -----------
        // 1    ; eventType (0 if callback, 1 if call, 4 if dma (not used here), 2 if throwing call, 3 if throwing callback)
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

        headerView8[0] = (isCall ? 1 : 0) | (threw ? 2 : 0);
        headerView8[5] = argCount;

        this.recordBuffer.push(headerBuffer);

        // get arg type map
        const methodTypeMap = isCall ? this.callTypeMap : this.callbackTypeMap;
        let thisMethodTypeMap = methodTypeMap.get(methodIdx);
        if (thisMethodTypeMap) {
            if (!threw) {
                // double-check that ret type is compatible and encode
                this._recordValue(retVal, thisMethodTypeMap[0]);
            }

            // double-check that arg types are compatible and encode
            // XXX first index is reserved for return types in callbacks
            let mapOffset = isCall ? 0 : 1;
            const argCount = args.length;
            for (let i = 0; i < argCount; i++) {
                this._recordValue(args[i], thisMethodTypeMap[i + mapOffset]);
            }
        } else {
            console.warn(`[wle-trace] "${methodName}" is not a registered call${isCall ? '' : 'back'}. Guessing argument types${isCall ? '' : ' and return type'} from values`);
            // TODO improve this system so that not all numbers are floats,
            //      etc... use of space grows too big too fast with the current
            //      system when using guessed registration. it would be nice if
            //      wle-trace could guess the types of each method arg list
            //      BEFORE recording, by building the method type map JSON by
            //      "training" via listening to calls without recording

            // make type map for this method and encode
            thisMethodTypeMap = [];

            if (threw) {
                // FIXME this will make it so that this function never has a
                //       return type even if it returns a value in later calls,
                //       because the first call threw an error. maybe have a
                //       "generic callback" event type, which has the type map
                //       as part of the event?
                console.warn(`[wle-trace] first call${isCall ? '' : 'back'} for method "${methodName}" threw; assuming void return type`);
                thisMethodTypeMap.push(SpecialRetType.Void);
            } else {
                const retType = typeof retVal;
                let enc = null;
                if (retType === 'undefined') {
                    thisMethodTypeMap.push(SpecialRetType.Void);
                } else if (retType === 'number') {
                    thisMethodTypeMap.push(ValueType.Float64);
                    enc = new Float64Array([ retVal ]);
                } else if (retType === 'boolean') {
                    thisMethodTypeMap.push(ValueType.Boolean);
                    enc = new Uint8Array([ retVal ]);
                } else if (retType === 'string') {
                    thisMethodTypeMap.push(ValueType.String);
                    enc = new Uint32Array([ this._getStringIdx(retType) ]);
                } else {
                    debugger;
                    throw new Error(`Unexpected return type in WASM call${isCall ? '' : 'back'}`);
                }

                if (enc !== null) {
                    this.recordBuffer.push(enc);
                }
            }

            for (const arg of args) {
                const argType = typeof arg;
                let enc;
                if (argType === 'number') {
                    thisMethodTypeMap.push(ValueType.Float64);
                    enc = new Float64Array([ arg ]);
                } else if (argType === 'boolean') {
                    thisMethodTypeMap.push(ValueType.Boolean);
                    enc = new Uint8Array([ arg ]);
                } else if (argType === 'string') {
                    thisMethodTypeMap.push(ValueType.String);
                    enc = new Uint32Array([ this._getStringIdx(argType) ]);
                } else {
                    debugger;
                    throw new Error(`Unexpected argument type in WASM call${isCall ? '' : 'back'}`);
                }

                this.recordBuffer.push(enc);
            }

            methodTypeMap.set(methodIdx, thisMethodTypeMap);
        }
    }

    recordWASMDMA(dst: ArrayBuffer | TypedArray, src: ArrayBuffer | TypedArray, offset: number) {
        if (!this.recordBuffer || this.engine === null) {
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
        this.recordBuffer.push(new Uint8Array([ 2 ]));
        this.recordBuffer.push(new Uint32Array([ offset, byteLength ]));

        // console.debug('record dma', byteLength, '@', offset);

        // add buffer to replay buffer
        const srcCopy = new Uint8Array(byteLength);
        if (ArrayBuffer.isView(src)) {
            srcCopy.set(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
        } else {
            srcCopy.set(new Uint8Array(src, 0, byteLength));
        }

        this.recordBuffer.push(srcCopy);
    }

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

    _encodeMethodTypeMap(chunks: ArrayBuffer[], methodTypeMap: MethodTypeMap) {
        // method type map size
        chunks.push(new Uint32Array([methodTypeMap.size]));

        // method types
        for (const [methodIdx, argTypes] of methodTypeMap) {
            chunks.push(new Uint32Array([ methodIdx, argTypes.length ]));
            chunks.push(new Uint8Array(argTypes));
        }
    }

    stopRecording(): Blob {
        if (!this.recordBuffer) {
            throw new Error("Can't stop recording; not recording");
        }

        console.debug('[wle-trace CONTROLLER] recording stopped');

        const chunks: ArrayBuffer[] = [];

        // encode magic
        chunks.push(MAGIC);

        // encode format version
        chunks.push(new Uint16Array([ REPLAY_FORMAT_VERSION ]));

        // encode string dictionary
        const textEncoder = new TextEncoder();

        chunks.push(new Uint32Array([ this.stringDictionary.length ]));
        for (const str of this.stringDictionary) {
            const strBuf = textEncoder.encode(str);
            chunks.push(new Uint32Array([ strBuf.byteLength ]));
            chunks.push(strBuf);
        }

        this.stringDictionary.length = 0;

        // encode call type map
        this._encodeMethodTypeMap(chunks, this.callTypeMap);
        this.callTypeMap.clear();

        // encode callback type map
        this._encodeMethodTypeMap(chunks, this.callbackTypeMap);
        this.callbackTypeMap.clear();

        // tie everything up
        chunks.push(...this.recordBuffer);
        this.recordBuffer = null;

        return new Blob(chunks);
    }

    stopRecordingAndDownload() {
        const blob = this.stopRecording();

        const blobURL = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobURL;
        link.download = `demo-${Date.now()}.wletdf`;
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

    registerCallMethod(methodName: string, argTypes: ArgType[], retType: RetType) {
        this.callTypeMap.set(this._getStringIdx(methodName), [retType, ...argTypes]);
    }

    registerCallbackMethod(methodName: string, argTypes: ArgType[], retType: RetType) {
        this.callbackTypeMap.set(this._getStringIdx(methodName), [retType, ...argTypes]);
    }

    _registerTypeMapFromJSON(isCallback: boolean, record: Record<string, CallTypeJSON>): void {
        for (const methodName of Object.getOwnPropertyNames(record)) {
            const def = record[methodName];
            if (typeof def !== 'object' || !Array.isArray(def.args)) {
                throw new Error(`Invalid type definition for call${isCallback ? 'back' : ''} method "${methodName}"`);
            }

            const argTypes: ArgType[] = [];
            const argDefs = def.args;
            for (const argDef of argDefs) {
                if (argDef === ValueTypeJSON.Uint32) {
                    argTypes.push(ValueType.Uint32);
                } else if (argDef === ValueTypeJSON.Int32) {
                    argTypes.push(ValueType.Int32);
                } else if (argDef === ValueTypeJSON.Float32) {
                    argTypes.push(ValueType.Float32);
                } else if (argDef === ValueTypeJSON.Float64) {
                    argTypes.push(ValueType.Float64);
                } else if (argDef === ValueTypeJSON.Pointer) {
                    argTypes.push(ValueType.Pointer);
                } else if (argDef === ValueTypeJSON.Boolean) {
                    argTypes.push(ValueType.Boolean);
                } else if (argDef === ValueTypeJSON.String) {
                    argTypes.push(ValueType.String);
                } else {
                    throw new Error(`Invalid argument type "${argDef}"`)
                }
            }

            const retDef = def.ret;
            let retType: RetType;

            if (retDef) {
                if (retDef === ValueTypeJSON.Uint32) {
                    retType = ValueType.Uint32;
                } else if (retDef === ValueTypeJSON.Int32) {
                    retType = ValueType.Int32;
                } else if (retDef === ValueTypeJSON.Float32) {
                    retType = ValueType.Float32;
                } else if (retDef === ValueTypeJSON.Float64) {
                    retType = ValueType.Float64;
                } else if (retDef === ValueTypeJSON.Pointer) {
                    retType = ValueType.Pointer;
                } else if (retDef === ValueTypeJSON.Boolean) {
                    retType = ValueType.Boolean;
                } else if (retDef === ValueTypeJSON.String) {
                    retType = ValueType.String;
                } else {
                    throw new Error(`Invalid return type "${retDef}"`)
                }
            } else {
                retType = SpecialRetType.Void;
            }

            if (isCallback) {
                this.registerCallbackMethod(methodName, argTypes, retType);
            } else {
                this.registerCallMethod(methodName, argTypes, retType);
            }
        }
    }

    registerTypeMapsFromJSON(json: MethodTypeMapsJSON) {
        if (json.version === 1) {
            const calls = json.calls;
            if (calls) {
                this._registerTypeMapFromJSON(false, calls);
            }

            const callbacks = json.callbacks;
            if (callbacks) {
                this._registerTypeMapFromJSON(true, callbacks);
            }
        } else {
            throw new Error(`Unsupported JSON type map file version (${json.version})`);
        }
    }
}
