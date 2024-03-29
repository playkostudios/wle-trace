import { type TypedArrayCtor, type TypedArray, type loadRuntime as wleLoadRuntime, type WASM } from '@wonderlandengine/api';
import { WLETraceSentinelBase } from '../common/WLETraceSentinelBase.js';
import { type MethodTypeMap } from '../common/types/MethodTypeMap.js';
import { ValueType } from '../common/types/ValueType.js';
import { MAGIC } from '../common/magic.js';
import { type CallTypeJSON } from './types/CallTypeJSON.js';
import { ValueTypeJSON } from './types/ValueTypeJSON.js';
import { type MethodTypeMapsJSON } from './types/MethodTypeMapsJSON.js';
import { EventType } from '../common/types/EventType.js';
import { getGlobalSWInjector } from '../common/WLETraceSWInjector.js';
import { injectRecorderImport } from './inject/injectRecorderImport.js';
import { makeOutOfPlaceRecorderHook } from './inject/makeOutOfPlaceRecorderHook.js';
import { injectTypedArrayRecorder } from './hooks/TypedArray.js';
import { injectCanvasInstance } from './hooks/HTMLCanvasElementInstance.js';

export const REPLAY_FORMAT_VERSION = 1;

// encodings:
//  encoding type        | byte count or [encoding] | description
// ----------------------+--------------------------+---------------------
//  value (basic TYPE)   | sizeof(TYPE)             | TYPE value
// ----------------------+--------------------------+---------------------
//  value (bool)         | 1                        | u8 bool value (0/1)
// ----------------------+--------------------------+---------------------
//  value (void)         | 0                        | nothing
// ----------------------+--------------------------+---------------------
//  call                 | 4                        | u32 method index
//                       | [value]?                 | return value
//                       | [value]*                 | argument values
// ----------------------+--------------------------+---------------------
//  no-ret-call          | 4                        | u32 method index
//                       | [value]*                 | argument values
// ----------------------+--------------------------+---------------------
//  multi-dma            | 4                        | destination
//                       | len                      | buffer
// ----------------------+--------------------------+---------------------
//  idx-dma-(basic TYPE) | 4                        | destination
//                       | [value (basic TYPE)]     | value

export class WLETraceRecorder extends WLETraceSentinelBase {
    private callStack = new Array<number>();
    private recordBuffer: null | ArrayBuffer[] = [];
    private _heapBuffer: ArrayBuffer | null = null;
    private stringDictionary = new Array<string>();
    private callTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private callbackTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private _ready: Array<[() => void, (err: unknown) => void]> | boolean = [];

    stopAndDownloadOnSentinel = false;

    constructor(readonly loadRuntime: typeof wleLoadRuntime) {
        super();

        // -- setup default sentinel handler --
        this.addSentinelHandler(() => {
            if (this.stopAndDownloadOnSentinel && this.recording) {
                this.stopAndDownload();
            }
        });
    }

    static async create(typeMapJSON?: MethodTypeMapsJSON) {
        const swInjector = getGlobalSWInjector();
        const loadRuntime = await swInjector.makeLoadRuntimeWrapper((imports, context) => {
            // TODO remove context param and from stage 1 injection if not used
            // TODO maybe only keep "Module"
            // wrap imports
            for (const moduleImports of Object.values(imports)) {
                for (const importName of Object.keys(moduleImports)) {
                    injectRecorderImport(false, recorder, moduleImports, importName);
                }
            }

            // wrap canvas
            injectCanvasInstance(recorder, (context.Module as WASM).canvas);
        }, (instantiatedSource, _context) => {
            // TODO remove context param and from stage 2 injection if not used
            // XXX can't wrap exports in-place because wasm instance objects are
            //     read-only
            const newExports: WebAssembly.Exports = {};
            const origExports = instantiatedSource.instance.exports;
            for (const [exportName, origExport] of Object.entries(origExports)) {
                if (origExport instanceof WebAssembly.Global) {
                    throw new Error('WebAssembly globals are not supported by wle-trace');
                } else if (origExport instanceof WebAssembly.Memory) {
                    // TODO
                    newExports[exportName] = origExport;
                } else if (origExport instanceof WebAssembly.Table) {
                    // TODO
                    console.debug('!!! TODO table', origExport)
                    newExports[exportName] = origExport;
                } else {
                    newExports[exportName] = makeOutOfPlaceRecorderHook(true, recorder, exportName, origExport);
                }
            }

            recorder.startRecording(origExports);

            return {
                instance: {
                    exports: newExports,
                },
                module: instantiatedSource.module,
            };
        });

        const recorder = new WLETraceRecorder(loadRuntime);

        if (typeMapJSON) {
            recorder.registerTypeMapsFromJSON(typeMapJSON);
        }

        injectTypedArrayRecorder(recorder);

        return recorder;
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

    startRecording(wasmExports?: WebAssembly.Exports) {
        if (this._heapBuffer) {
            throw new Error('Already recording');
        } else if (!this.recordBuffer) {
            throw new Error('Recording buffer already destroyed; are you reusing a recorder?');
        }

        const heapBuffer = (wasmExports?.memory as WebAssembly.Memory | undefined)?.buffer;
        if (!heapBuffer) {
            throw new Error('Could not get WebAssembly memory');
        }

        this._heapBuffer = heapBuffer;

        console.debug('[wle-trace RECORDER] Recording started');

        if (Array.isArray(this._ready)) {
            for (const [resolve, _reject] of this._ready) {
                resolve();
            }
        }

        this._ready = true;
    }

    get recording(): boolean {
        return this._heapBuffer !== null && this.recordBuffer !== null;
    }

    discard(): void {
        if (!this.recording) {
            return;
        }

        this.recordBuffer = null;
        this.stringDictionary.length = 0;
        this.callTypeMap.clear();
        this.callbackTypeMap.clear();
    }

    stop(): Blob {
        if (!this.recording) {
            throw new Error("Can't stop recording; not recording");
        }

        console.debug('[wle-trace RECORDER] Stopped recording');
        const recordBuffer = this.recordBuffer!;
        const chunks: ArrayBuffer[] = [];

        // encode magic
        chunks.push(MAGIC);

        // encode format version and string dictionary size
        const remHeaderBuffer = new ArrayBuffer(6);
        const remHeaderBufferView = new DataView(remHeaderBuffer);
        remHeaderBufferView.setUint16(0, REPLAY_FORMAT_VERSION);
        remHeaderBufferView.setUint32(2, this.stringDictionary.length);
        chunks.push(remHeaderBuffer);

        // encode string dictionary data
        const textEncoder = new TextEncoder();

        for (const str of this.stringDictionary) {
            const strBuf = textEncoder.encode(str);

            const sizeBuffer = new ArrayBuffer(4);
            const sizeBufferView = new DataView(sizeBuffer);
            sizeBufferView.setUint32(0, strBuf.byteLength);

            chunks.push(sizeBuffer);
            chunks.push(strBuf);
        }

        // encode call type map
        this.encodeMethodTypeMap(chunks, this.callTypeMap);

        // encode callback type map
        this.encodeMethodTypeMap(chunks, this.callbackTypeMap);

        // cleanup
        this.discard();

        // tie everything up
        for (const chunk of recordBuffer) {
            chunks.push(chunk);
        }

        return new Blob(chunks);
    }

    stopAndDownload() {
        const blobURL = window.URL.createObjectURL(this.stop());
        const link = document.createElement('a');
        link.href = blobURL;
        link.download = `demo-${Date.now()}.wletd`;
        link.click();
        window.URL.revokeObjectURL(blobURL);
    }

    private getStringIdx(str: string): number {
        let idx = this.stringDictionary.indexOf(str);
        if (idx < 0) {
            idx = this.stringDictionary.length;
            this.stringDictionary.push(str);
        }

        return idx;
    }

    private recordValue(val: unknown, expectedType: ValueType): boolean {
        let enc: ArrayBuffer;
        const valType = typeof val;
        let handleMemChanges = false;

        if (expectedType === ValueType.Void) {
            if (val !== undefined) {
                // console.warn(`[wle-trace RECORDER] ignoring value; void expected, but got a non-undefined value`);
            }

            return false;
        } else if (expectedType === ValueType.Uint32 || expectedType === ValueType.Int32 || expectedType === ValueType.Float32 || expectedType === ValueType.Float64) {
            if (valType !== 'number') {
                if (val === undefined || val === null) {
                    val = 0;
                } else if (valType === 'boolean') {
                    val = val ? 1 : 0;
                } else {
                    throw new Error('Impossible cast to number');
                }

                // console.warn(`[wle-trace RECORDER] casting value to number; number expected`);
            }

            if (expectedType === ValueType.Uint32) {
                enc = new ArrayBuffer(4);
                new DataView(enc).setUint32(0, val as number);
            } else if (expectedType === ValueType.Int32) {
                enc = new ArrayBuffer(4);
                new DataView(enc).setInt32(0, val as number);
            } else if (expectedType === ValueType.Float32) {
                enc = new ArrayBuffer(4);
                new DataView(enc).setFloat32(0, val as number);
            } else {
                enc = new ArrayBuffer(8);
                new DataView(enc).setFloat64(0, val as number);
            }
        } else if (expectedType === ValueType.Boolean) {
            if (valType !== 'boolean') {
                // console.warn(`[wle-trace RECORDER] casting value to boolean; boolean expected`);
            }

            enc = new ArrayBuffer(1);
            new DataView(enc).setUint8(0, val ? 1 : 0);
        } else {
            throw new Error('Invalid expected type');
        }

        this.recordBuffer!.push(enc);
        return handleMemChanges;
    }

    private handleError(err: unknown, action: string): void {
        console.error(`[wle-trace RECORDER] Exception occurred while ${action}, recording will be discarded:`, err);
        this.discard();
    }

    recordWASMGenericCallLeave(isCall: boolean, methodName: string, _args: any[], threw: boolean, retVal?: unknown) {
        if (!this.recordBuffer || !this._heapBuffer) {
            return;
        }

        // console.debug(`[wle-trace RECORDER] record call${isCall ? '' : 'back'} leave`, methodName, threw, retVal);

        try {
            // verify callback is in top of stack
            const methodIdx = this.getStringIdx(methodName);
            const stackTop = this.callStack.pop();

            if (stackTop === undefined) {
                throw new Error(`Unexpected call${isCall ? '' : 'back'} leave`);
            }

            if (stackTop !== methodIdx) {
                throw new Error(`Mismatching call${isCall ? '' : 'back'} leave`);
            }

            // record return
            const headerBuffer = new ArrayBuffer(1);
            const headerBufferView = new DataView(headerBuffer);
            headerBufferView.setUint8(0, threw ? EventType.Throw : EventType.Return);

            this.recordBuffer.push(headerBuffer);

            if (!threw) {
                // record value if return was successful
                const thisMethodTypeMap = (isCall ? this.callTypeMap : this.callbackTypeMap).get(methodIdx);
                if (thisMethodTypeMap === undefined) {
                    throw new Error(`Missing method type map for call${isCall ? '' : 'back'} leave`);
                }

                this.recordValue(retVal, thisMethodTypeMap[0]);
            }
        } catch (err) {
            this.handleError(err, `recording WASM call${isCall ? '' : 'back'} leave`);
        }
    }

    recordWASMGenericCallEnter(isCall: boolean, methodName: string, args: any[]) {
        if (!this.recordBuffer || !this._heapBuffer) {
            return;
        }

        // console.debug(`[wle-trace RECORDER] record call${isCall ? '' : 'back'} enter`, methodName, ...args);

        try {
            // get index of method name
            const methodIdx = this.getStringIdx(methodName);

            // prepare header of method call(back)
            const headerBuffer = new ArrayBuffer(5);
            const headerBufferView = new DataView(headerBuffer);
            headerBufferView.setUint8(0, isCall ? EventType.Call : EventType.Callback);
            headerBufferView.setUint32(1, methodIdx);

            this.recordBuffer.push(headerBuffer);

            // push to call stack
            this.callStack.push(methodIdx);

            // get arg type map
            const methodTypeMap = isCall ? this.callTypeMap : this.callbackTypeMap;
            let thisMethodTypeMap = methodTypeMap.get(methodIdx);
            if (thisMethodTypeMap) {
                // double-check that arg types are compatible and encode
                // XXX first index is reserved for return types
                const argCount = args.length;
                for (let i = 0; i < argCount; i++) {
                    this.recordValue(args[i], thisMethodTypeMap[i + 1]);
                }
            } else {
                console.warn(`[wle-trace RECORDER] "${methodName}" is not a registered call${isCall ? '' : 'back'}. Guessing argument types from values, but return type will be void`);
                // TODO improve this system so that not all numbers are floats,
                //      etc... use of space grows too big too fast with the
                //      current system when using guessed registration. it would
                //      be nice if wle-trace could guess the types of each
                //      method arg list BEFORE recording, by building the method
                //      type map JSON by "training" via listening to calls
                //      without recording
                //      - this is probably impossible because of malloc + free

                // make type map for this method and encode
                thisMethodTypeMap = [ValueType.Void];

                for (const arg of args) {
                    const argType = typeof arg;
                    let enc;
                    if (argType === 'number') {
                        thisMethodTypeMap.push(ValueType.Float64);
                        enc = new ArrayBuffer(8);
                        new DataView(enc).setFloat64(0, arg);
                    } else if (argType === 'boolean') {
                        thisMethodTypeMap.push(ValueType.Boolean);
                        enc = new ArrayBuffer(1);
                        new DataView(enc).setUint8(0, arg);
                    } else {
                        debugger;
                        throw new Error(`Unexpected argument type in WASM call${isCall ? '' : 'back'}`);
                    }

                    this.recordBuffer.push(enc);
                }

                methodTypeMap.set(methodIdx, thisMethodTypeMap);
            }
        } catch (err) {
            this.handleError(err, `recording WASM call${isCall ? '' : 'back'} enter`);
        }
    }

    isHeapBuffer(buffer: ArrayBuffer): boolean {
        return !!this._heapBuffer && buffer === this._heapBuffer;
    }

    recordWASMDMA(dst: TypedArray, src: ArrayLike<number>, offset: number) {
        if (!this.recordBuffer || !this._heapBuffer) {
            return;
        }

        // verify that the dma offset is in the bounds of the destination, and
        // that the dma length is non-zero
        const dstBuf = dst.buffer;
        offset *= dst.BYTES_PER_ELEMENT;
        offset += dst.byteOffset;

        if ((dstBuf.byteLength - offset) <= 0 || offset < 0 || src.length === 0) {
            return;
        }

        // verify that the destination is the heap
        if (!this.isHeapBuffer(dstBuf)) {
            return;
        }

        try {
            // prepare buffer copy
            let srcCopy: TypedArray;
            if (ArrayBuffer.isView(src)) {
                // typed array src
                const srcTA = src as TypedArray;
                srcCopy = srcTA.slice();
            } else {
                // array src
                srcCopy = new (dst.constructor as TypedArrayCtor)(src);
            }

            const srcCopyCast = new Uint8Array(srcCopy.buffer, 0, srcCopy.byteLength);

            // prepare header of dma set
            const headerBuffer = new ArrayBuffer(9);
            const headerBufferView = new DataView(headerBuffer);
            headerBufferView.setUint8(0, EventType.MultiDMA);
            headerBufferView.setUint32(1, offset);
            headerBufferView.setUint32(5, srcCopyCast.byteLength);

            this.recordBuffer.push(headerBuffer);

            // add buffer to replay buffer
            this.recordBuffer.push(srcCopyCast);
        } catch (err) {
            this.handleError(err, 'recording multi-byte DMA');
        }
    }

    recordWASMSingleDMA(dst: TypedArray, offset: number, value: number) {
        if (!this.recordBuffer || !this._heapBuffer) {
            return;
        }

        // verify that the destination is the heap
        if (!this.isHeapBuffer(dst.buffer)) {
            return;
        }

        try {
            // encode DMA type and value
            const byteCount = dst.BYTES_PER_ELEMENT;
            let sdmaType: EventType;
            let valBuf: TypedArray;

            if (byteCount === 1) {
                // i8, u8 or clamped u8
                if (dst instanceof Int8Array) {
                    sdmaType = EventType.IndexDMAi8;
                    valBuf = new Int8Array([ value ]);
                } else if (dst instanceof Uint8Array) {
                    sdmaType = EventType.IndexDMAu8;
                    valBuf = new Uint8Array([ value ]);
                } else {
                    sdmaType = EventType.IndexDMAu8;
                    valBuf = new Uint8ClampedArray([ value ]);
                }
            } else if (byteCount === 2) {
                // i16 or u16
                if (dst instanceof Int16Array) {
                    sdmaType = EventType.IndexDMAi16;
                    valBuf = new Int16Array([ value ]);
                } else {
                    sdmaType = EventType.IndexDMAu16;
                    valBuf = new Uint16Array([ value ]);
                }
            } else if (byteCount === 4) {
                // i32, u32 or f32
                if (dst instanceof Int32Array) {
                    sdmaType = EventType.IndexDMAi32;
                    valBuf = new Int32Array([ value ]);
                } else if (dst instanceof Uint32Array) {
                    sdmaType = EventType.IndexDMAu32;
                    valBuf = new Uint32Array([ value ]);
                } else {
                    sdmaType = EventType.IndexDMAf32;
                    valBuf = new Float32Array([ value ]);
                }
            } else if (byteCount === 8) {
                // f64 or bigint (unsupported)
                // assume it's f64, since instanceof is expensive
                sdmaType = EventType.IndexDMAf64;
                valBuf = new Float64Array([ value ]);
            } else {
                // unknown
                throw new Error('Unknown TypedArray')
            }

            // generate header and record to buffer
            this.recordBuffer.push(new Uint8Array([ sdmaType ]));
            this.recordBuffer.push(new Uint32Array([ dst.byteOffset + offset * byteCount ]));
            this.recordBuffer.push(valBuf);
        } catch (err) {
            this.handleError(err, 'recording indexed/single-value DMA');
        }
    }

    private encodeMethodTypeMap(chunks: ArrayBuffer[], methodTypeMap: MethodTypeMap) {
        // method type map size
        const sizeBuffer = new ArrayBuffer(4);
        const sizeBufferView = new DataView(sizeBuffer);
        sizeBufferView.setUint32(0, methodTypeMap.size)
        chunks.push(sizeBuffer);

        // method types
        for (const [methodIdx, argTypes] of methodTypeMap) {
            const methodBuffer = new ArrayBuffer(8 + argTypes.length);
            const methodBufferView = new DataView(methodBuffer);
            methodBufferView.setUint32(0, methodIdx);
            methodBufferView.setUint32(4, argTypes.length);

            let i = 8;
            for (const type of argTypes) {
                methodBufferView.setUint8(i++, type);
            }

            chunks.push(methodBuffer);
        }
    }

    registerCallMethod(methodName: string, argTypes: ValueType[], retType: ValueType) {
        this.callTypeMap.set(this.getStringIdx(methodName), [retType, ...argTypes]);
    }

    registerCallbackMethod(methodName: string, argTypes: ValueType[], retType: ValueType) {
        this.callbackTypeMap.set(this.getStringIdx(methodName), [retType, ...argTypes]);
    }

    private registerTypeMapFromJSON(isCallback: boolean, record: Record<string, CallTypeJSON>): void {
        for (const methodName of Object.getOwnPropertyNames(record)) {
            const def = record[methodName];
            if (typeof def !== 'object') {
                throw new Error(`Invalid type definition for call${isCallback ? 'back' : ''} method "${methodName}"; definition must be an object`);
            }

            const argTypes: ValueType[] = [];
            const argDefs = def.args;
            if (argDefs) {
                if (!Array.isArray(def.args)) {
                    throw new Error(`Invalid type definition for call${isCallback ? 'back' : ''} method "${methodName}"; arguments must be an array or not included`);
                }

                for (const argDef of argDefs) {
                    if (argDef === ValueTypeJSON.Uint32) {
                        argTypes.push(ValueType.Uint32);
                    } else if (argDef === ValueTypeJSON.Int32 || argDef === ValueTypeJSON.Int53) {
                        argTypes.push(ValueType.Int32);
                    } else if (argDef === ValueTypeJSON.Float32) {
                        argTypes.push(ValueType.Float32);
                    } else if (argDef === ValueTypeJSON.Float64) {
                        argTypes.push(ValueType.Float64);
                    } else if (argDef === ValueTypeJSON.Boolean) {
                        argTypes.push(ValueType.Boolean);
                    } else {
                        throw new Error(`Invalid argument type "${argDef}"`)
                    }
                }
            }

            const retDef = def.ret;
            let retType: ValueType;

            if (retDef) {
                if (retDef === ValueTypeJSON.Uint32) {
                    retType = ValueType.Uint32;
                } else if (retDef === ValueTypeJSON.Int32 || retDef === ValueTypeJSON.Int53) {
                    retType = ValueType.Int32;
                } else if (retDef === ValueTypeJSON.Float32) {
                    retType = ValueType.Float32;
                } else if (retDef === ValueTypeJSON.Float64) {
                    retType = ValueType.Float64;
                } else if (retDef === ValueTypeJSON.Boolean) {
                    retType = ValueType.Boolean;
                } else {
                    throw new Error(`Invalid return type "${retDef}"`)
                }
            } else {
                retType = ValueType.Void;
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
                this.registerTypeMapFromJSON(false, calls);
            }

            const callbacks = json.callbacks;
            if (callbacks) {
                this.registerTypeMapFromJSON(true, callbacks);
            }
        } else {
            throw new Error(`Unsupported JSON type map file version (${json.version})`);
        }
    }
}