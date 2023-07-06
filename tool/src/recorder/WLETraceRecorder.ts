import { type TypedArrayCtor, type TypedArray, type WASM } from '@wonderlandengine/api';
import { WLETraceSentinelBase } from '../common/WLETraceSentinelBase.js';
import { type WLETraceEarlyInjector } from '../common/WLETraceEarlyInjector.js';
import { lateInjectWonderlandEngineRecorder } from './hooks/WonderlandEngine.js';
import { RecorderAllocationMap } from './RecorderAllocationMap.js';
import { type MethodTypeMap } from '../common/types/MethodTypeMap.js';
import { ValueType } from '../common/types/ValueType.js';
import { MAGIC } from '../common/magic.js';
import { type CallTypeJSON } from './types/CallTypeJSON.js';
import { ValueTypeJSON } from './types/ValueTypeJSON.js';
import { type MethodTypeMapsJSON } from './types/MethodTypeMapsJSON.js';
import { EventType } from '../common/types/EventType.js';

export const REPLAY_FORMAT_VERSION = 1;

// encodings:
//  encoding type        | byte count or [encoding] | description
// ----------------------+--------------------------+---------------------
//  value (basic TYPE)   | sizeof(TYPE)             | TYPE value
// ----------------------+--------------------------+---------------------
//  value (bool)         | 1                        | u8 bool value (0/1)
// ----------------------+--------------------------+---------------------
//  value (str)          | 4                        | u32 string index
// ----------------------+--------------------------+---------------------
//  value (ptr)          | [pointer]                | memory location
// ----------------------+--------------------------+---------------------
//  value (mattrs_ptr)   | 1                        | u8, 1 if good alloc
// ----------------------+--------------------------+---------------------
//  value (idatas_ptr)   | [pointer]                | memory location
// ----------------------+--------------------------+---------------------
//  value (idata_ptr)    | 1                        | u8, 1 if good alloc
// ----------------------+--------------------------+---------------------
//  value (ptr_free)     | [alloc-id]               | alloc ID to free
// ----------------------+--------------------------+---------------------
//  value (ptr_new)      | 1                        | u8, 1 if good alloc
// ----------------------+--------------------------+---------------------
//  value (ptr_new_size) | 4                        | allocation size
// ----------------------+--------------------------+---------------------
//  value (ptr_new_end)  | 0                        | nothing
// ----------------------+--------------------------+---------------------
//  value (ptr_temp)     | 0                        | nothing
// ----------------------+--------------------------+---------------------
//  value (void)         | 0                        | nothing
// ----------------------+--------------------------+---------------------
//  value (ptr_pre_*)    | 0                        | nothing
// ----------------------+--------------------------+---------------------
//  pointer (null)       | 4                        | zeroed 4 bytes
// ----------------------+--------------------------+---------------------
//  pointer (non-null)   | [alloc-ref]              | memory location
// ----------------------+--------------------------+---------------------
//  alloc-id             | 4                        | u32 alloc ID + 1
// ----------------------+--------------------------+---------------------
//  alloc-ref            | [alloc-id]               | alloc ID
//                       | 4                        | u32 relative offset
// ----------------------+--------------------------+---------------------
//  call                 | 4                        | u32 method index
//                       | [value]?                 | return value
//                       | [value]*                 | argument values
// ----------------------+--------------------------+---------------------
//  no-ret-call          | 4                        | u32 method index
//                       | [value]*                 | argument values
// ----------------------+--------------------------+---------------------
//  multi-dma            | [alloc-ref]              | destination
//                       | len                      | buffer
// ----------------------+--------------------------+---------------------
//  idx-dma-(basic TYPE) | [alloc-ref]              | destination
//                       | [value (basic TYPE)]     | value

// XXX emulate C++ friend classes/methods
const expectedFriendKey = Symbol('WLETraceRecorder friend key');
function checkFriendKey(friendKey: symbol) {
    if (friendKey !== expectedFriendKey) {
        throw new Error('Caller does not have permission to use this method');
    }
}

export class WLETraceRecorder extends WLETraceSentinelBase implements WLETraceEarlyInjector {
    private callStack = new Array<number>();
    private recordBuffer: null | ArrayBuffer[] = [];
    private _wasm: WASM | null = null;
    private stringDictionary = new Array<string>();
    private callTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private callbackTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private _ready: Array<[() => void, (err: unknown) => void]> | boolean = [];
    private allocMap: RecorderAllocationMap;
    private hookDepth = 0;
    private ignore = false;

    stopAndDownloadOnSentinel = false;

    constructor() {
        super();

        this.allocMap = new RecorderAllocationMap(this, expectedFriendKey);

        // -- setup default sentinel handler --
        this.addSentinelHandler(() => {
            if (this.stopAndDownloadOnSentinel && this.recording) {
                this.stopAndDownload();
            }
        });
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

    // XXX friend method
    setIgnore(ignore: boolean, friendKey: symbol) {
        checkFriendKey(friendKey);
        this.ignore = ignore;
    }

    private async lateInject() {
        try {
            await lateInjectWonderlandEngineRecorder(this);
        } catch (err) {
            if (Array.isArray(this._ready)) {
                for (const [_resolve, reject] of this._ready) {
                    reject(err);
                }
            }

            this._ready = false;
            return;
        }

        console.debug('[wle-trace RECORDER] Late init hook called; recorder is ready for user-defined initialization');

        if (Array.isArray(this._ready)) {
            for (const [resolve, _reject] of this._ready) {
                resolve();
            }
        }

        this._ready = true;
    }

    get wasm(): WASM | null {
        return this._wasm;
    }

    set wasm(wasm: WASM) {
        if (this._wasm) {
            throw new Error('WASM instance already set; are you reusing a replayer?');
        }

        this._wasm = wasm;
        this.lateInject();
        console.debug("[wle-trace RECORDER] Early init hook called; started recording. Don't forget to stop recording by calling recorder.stop()");
    }

    get recording(): boolean {
        return this._wasm !== null && this.recordBuffer !== null;
    }

    get inHook(): boolean {
        return this.hookDepth > 0;
    }

    discard(): void {
        if (!this.recording) {
            return;
        }

        this.hookDepth = 0;
        this.recordBuffer = null;
        this.stringDictionary.length = 0;
        this.callTypeMap.clear();
        this.callbackTypeMap.clear();
        this.allocMap.clear();
        this.ignore = false;
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

    private encodeAllocRef(allocID: number, relOffset: number, bufferView?: DataView, offset: number = 0) {
        let enc, encView;

        if (bufferView) {
            enc = bufferView.buffer;
            encView = bufferView;
        } else {
            enc = new ArrayBuffer(8);
            encView = new DataView(enc);
        }

        encView.setUint32(offset, allocID + 1);
        encView.setUint32(offset + 4, relOffset);
        return enc;
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
        } else if (expectedType === ValueType.Uint32 || expectedType === ValueType.Int32 || expectedType === ValueType.Float32 || expectedType === ValueType.Float64 || expectedType === ValueType.PointerAllocSize || expectedType === ValueType.MeshAttributeMeshIndex) {
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

            if (expectedType === ValueType.Uint32 || expectedType === ValueType.PointerAllocSize || expectedType === ValueType.MeshAttributeMeshIndex) {
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
        } else if (expectedType === ValueType.String) {
            if (valType !== 'string') {
                val = String(val);
                // console.warn(`[wle-trace RECORDER] casting value to string; string expected`);
            }

            enc = new ArrayBuffer(4);
            new DataView(enc).setUint32(0, this.getStringIdx(val as string));
        } else if (expectedType === ValueType.Pointer || expectedType === ValueType.IndexDataStructPointer) {
            if (valType !== 'number') {
                if (val === undefined || val === null) {
                    val = 0;
                    // console.warn(`[wle-trace RECORDER] casting value to null pointer; pointer expected`);
                } else {
                    throw new Error('Impossible cast to pointer');
                }
            }

            if (val === 0) {
                // null pointer, encode in short format
                enc = new ArrayBuffer(4);
            } else {
                // non-null pointer, encode in long format
                const [allocID, relOffset] = this.allocMap.getID(val as number);
                enc = this.encodeAllocRef(allocID, relOffset);
            }
        } else if (expectedType === ValueType.PointerFree) {
            if (valType !== 'number') {
                if (val === undefined || val === null) {
                    val = 0;
                    // console.warn(`[wle-trace RECORDER] casting value to null pointer; pointer expected`);
                } else {
                    throw new Error('Impossible cast to pointer');
                }
            }

            enc = new ArrayBuffer(4);
            let allocID = 0;

            if (val !== 0) {
                allocID = this.allocMap.getIDFromStart(val as number) + 1;
            }

            new DataView(enc).setUint32(0, allocID);
            handleMemChanges = true;
        } else if (expectedType === ValueType.PointerAlloc || expectedType === ValueType.PointerAllocEnd) {
            if (valType !== 'number') {
                if (val === undefined || val === null) {
                    val = 0;
                    // console.warn(`[wle-trace RECORDER] casting value to null pointer; pointer expected`);
                } else {
                    throw new Error('Impossible cast to pointer');
                }
            }

            // this is a pointer allocation, therefore it doesn't make sense to
            // store the memory range or pointer address. we just need to store
            // whether the allocation was valid with a boolean
            handleMemChanges = val !== 0;
            enc = new ArrayBuffer(1);
            new DataView(enc).setUint8(0, handleMemChanges ? 1 : 0);
        } else if (expectedType === ValueType.PointerTemp || expectedType >= ValueType.PointerPreStart) {
            // XXX value can be safely ignored; this is a temporary pointer,
            //     which will not be mapped to anything later on, or a
            //     pre-allocated pointer, which doesn't need to be stored
            return expectedType !== ValueType.PointerTemp;
        } else if (expectedType === ValueType.MeshAttributeStructPointer) {
            const struct = new Uint32Array(this._wasm!.HEAP8.buffer, val as number, 1);
            enc = new ArrayBuffer(1);
            const encView = new DataView(enc);

            if (struct[0] === 255) {
                encView.setUint8(0, 0);
            } else {
                encView.setUint8(0, 1);
                handleMemChanges = true;
            }
        } else if (expectedType === ValueType.IndexDataPointer) {
            enc = new ArrayBuffer(1);
            const encView = new DataView(enc);

            if (val === null) {
                encView.setUint8(0, 0);
            } else {
                encView.setUint8(0, 1);
                handleMemChanges = true;
            }
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

    recordWASMGenericCallLeave(isCall: boolean, methodName: string, args: any[], threw: boolean, retVal?: unknown) {
        if (this.ignore || !this.recordBuffer || this._wasm === null) {
            return;
        }

        console.debug(`[wle-trace RECORDER] record call${isCall ? '' : 'back'} leave`, methodName, threw, retVal);

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

                // handle (de)allocations if return was successful
                this.allocMap.handleCallAllocationChanges([retVal, ...args], thisMethodTypeMap);
            }
        } catch (err) {
            this.handleError(err, `recording WASM call${isCall ? '' : 'back'} leave`);
        }
    }

    recordWASMGenericCallEnter(isCall: boolean, methodName: string, args: any[]) {
        if (this.ignore || !this.recordBuffer || this._wasm === null) {
            return;
        }

        console.debug(`[wle-trace RECORDER] record call${isCall ? '' : 'back'} enter`, methodName, ...args);

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
                    } else if (argType === 'string') {
                        thisMethodTypeMap.push(ValueType.String);
                        enc = new ArrayBuffer(4);
                        new DataView(enc).setUint32(0, this.getStringIdx(arg));
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
        const wasm = this._wasm;
        if (!wasm) {
            return false;
        }

        return buffer === wasm.HEAP8?.buffer ||
               buffer === wasm.HEAP16?.buffer ||
               buffer === wasm.HEAP32?.buffer ||
               buffer === wasm.HEAPU8?.buffer ||
               buffer === wasm.HEAPU16?.buffer ||
               buffer === wasm.HEAPU32?.buffer ||
               buffer === wasm.HEAPF32?.buffer ||
               buffer === wasm.HEAPF64?.buffer;
    }

    recordWASMDMA(dst: TypedArray, src: ArrayLike<number>, offset: number) {
        if (this.ignore || !this.recordBuffer || this._wasm === null) {
            return;
        }

        // verify that we are in a hook
        if (!this.inHook) {
            return;
        }

        // verify that the dma offset is in the bounds of the destination, and
        // that the dma length is non-zero
        const dstBuf = dst.buffer;
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

            // get mapped memory location
            const dmaLen = srcCopyCast.byteLength;
            console.debug('[wle-trace RECORDER] record dma', dmaLen, '@', offset);
            const [allocID, relOffset] = this.allocMap.getIDFromRange(offset, offset + dmaLen);

            // prepare header of dma set
            const headerBuffer = new ArrayBuffer(13);
            const headerBufferView = new DataView(headerBuffer);
            headerBufferView.setUint8(0, EventType.MultiDMA);
            this.encodeAllocRef(allocID, relOffset, headerBufferView, 1);
            headerBufferView.setUint32(9, dmaLen);

            this.recordBuffer.push(headerBuffer);

            // add buffer to replay buffer
            this.recordBuffer.push(srcCopyCast);
        } catch (err) {
            this.handleError(err, 'recording multi-byte DMA');
        }
    }

    recordWASMSingleDMA(dst: TypedArray, offset: number, value: number) {
        if (this.ignore || !this.recordBuffer || this._wasm === null) {
            return;
        }

        // verify that we are in a hook and that the destination is the heap
        if (!this.inHook || !this.isHeapBuffer(dst.buffer)) {
            return;
        }

        try {
            // get allocated offset
            const absOffset = dst.byteOffset + offset;
            const [allocID, relOffset] = this.allocMap.getID(absOffset);

            // generate buffer for header and value
            const byteCount = dst.BYTES_PER_ELEMENT;
            const headerSize = 9;
            const buf = new ArrayBuffer(headerSize + byteCount);
            const view = new DataView(buf);

            // encode alloc ref
            this.encodeAllocRef(allocID, relOffset, view, 1);

            // encode DMA type and value
            if (byteCount === 1) {
                // i8, u8 or clamped u8
                if (dst instanceof Int8Array) {
                    view.setUint8(0, EventType.IndexDMAi8);
                    view.setInt8(headerSize, value);
                } else if (dst instanceof Uint8Array) {
                    view.setUint8(0, EventType.IndexDMAu8);
                    view.setUint8(headerSize, value);
                } else {
                    view.setUint8(0, EventType.IndexDMAu8);
                    if (value <= 0) {
                        view.setUint8(headerSize, 0);
                    } else if (value >= 255) {
                        view.setUint8(headerSize, 255);
                    } else {
                        view.setUint8(headerSize, Math.round(value));
                    }
                }
            } else if (byteCount === 2) {
                // i16 or u16
                if (dst instanceof Int16Array) {
                    view.setUint8(0, EventType.IndexDMAi16);
                    view.setInt16(headerSize, value);
                } else {
                    view.setUint8(0, EventType.IndexDMAu16);
                    view.setUint16(headerSize, value);
                }
            } else if (byteCount === 4) {
                // i32, u32 or f32
                if (dst instanceof Int32Array) {
                    view.setUint8(0, EventType.IndexDMAi32);
                    view.setInt32(headerSize, value);
                } else if (dst instanceof Uint32Array) {
                    view.setUint8(0, EventType.IndexDMAu32);
                    view.setUint32(headerSize, value);
                } else {
                    view.setUint8(0, EventType.IndexDMAf32);
                    view.setFloat32(headerSize, value);
                }
            } else if (byteCount === 8) {
                // f64 or bigint (unsupported)
                // assume it's f64, since instanceof is expensive
                view.setUint8(0, EventType.IndexDMAf64);
                view.setFloat64(headerSize, value);
            } else {
                // unknown
                throw new Error('Unknown TypedArray')
            }

            // record buffer
            this.recordBuffer.push(buf);
        } catch (err) {
            this.handleError(err, 'recording indexed/single-value DMA');
        }
    }

    enterHook() {
        this.hookDepth++;
    }

    leaveHook() {
        if (this.hookDepth > 0) {
            this.hookDepth--;
        } else if (this.recording) {
            this.discard();
            throw new Error('[wle-trace RECORDER] Negative hook depth; an after/exception hook was not triggered, recording will be discarded');
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
            if (typeof def !== 'object' || !Array.isArray(def.args)) {
                throw new Error(`Invalid type definition for call${isCallback ? 'back' : ''} method "${methodName}"`);
            }

            const argTypes: ValueType[] = [];
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
                } else if (argDef === ValueTypeJSON.Boolean) {
                    argTypes.push(ValueType.Boolean);
                } else if (argDef === ValueTypeJSON.String) {
                    argTypes.push(ValueType.String);
                } else if (argDef === ValueTypeJSON.Pointer) {
                    argTypes.push(ValueType.Pointer);
                } else if (argDef === ValueTypeJSON.MeshAttributeMeshIndex) {
                    argTypes.push(ValueType.MeshAttributeMeshIndex);
                } else if (argDef === ValueTypeJSON.MeshAttributeStructPointer) {
                    argTypes.push(ValueType.MeshAttributeStructPointer);
                } else if (argDef === ValueTypeJSON.IndexDataStructPointer) {
                    argTypes.push(ValueType.IndexDataStructPointer);
                } else if (argDef === ValueTypeJSON.IndexDataPointer) {
                    argTypes.push(ValueType.IndexDataPointer);
                } else if (argDef === ValueTypeJSON.PointerFree) {
                    argTypes.push(ValueType.PointerFree);
                } else if (argDef === ValueTypeJSON.PointerAlloc) {
                    argTypes.push(ValueType.PointerAlloc);
                } else if (argDef === ValueTypeJSON.PointerAllocSize) {
                    argTypes.push(ValueType.PointerAllocSize);
                } else if (argDef === ValueTypeJSON.PointerAllocEnd) {
                    argTypes.push(ValueType.PointerAllocEnd);
                } else if (argDef === ValueTypeJSON.PointerTemp) {
                    argTypes.push(ValueType.PointerTemp);
                } else if (argDef.startsWith(ValueTypeJSON.PointerPrePrefix)) {
                    const suffix = argDef.substring(ValueTypeJSON.PointerPrePrefix.length);
                    const bytes = Number(suffix);

                    if (isNaN(bytes) || !isFinite(bytes) || bytes <= 0 || bytes > 128 || Math.trunc(bytes) !== bytes) {
                        throw new Error('Invalid pre-allocated pointer byte count');
                    }

                    argTypes.push(ValueType.PointerPreStart + bytes - 1);
                } else {
                    throw new Error(`Invalid argument type "${argDef}"`)
                }
            }

            const retDef = def.ret;
            let retType: ValueType;

            if (retDef) {
                if (retDef === ValueTypeJSON.Uint32) {
                    retType = ValueType.Uint32;
                } else if (retDef === ValueTypeJSON.Int32) {
                    retType = ValueType.Int32;
                } else if (retDef === ValueTypeJSON.Float32) {
                    retType = ValueType.Float32;
                } else if (retDef === ValueTypeJSON.Float64) {
                    retType = ValueType.Float64;
                } else if (retDef === ValueTypeJSON.Boolean) {
                    retType = ValueType.Boolean;
                } else if (retDef === ValueTypeJSON.String) {
                    retType = ValueType.String;
                } else if (retDef === ValueTypeJSON.Pointer) {
                    retType = ValueType.Pointer;
                } else if (retDef === ValueTypeJSON.MeshAttributeMeshIndex) {
                    retType = ValueType.MeshAttributeMeshIndex;
                } else if (retDef === ValueTypeJSON.MeshAttributeStructPointer) {
                    retType = ValueType.MeshAttributeStructPointer;
                } else if (retDef === ValueTypeJSON.IndexDataStructPointer) {
                    retType = ValueType.IndexDataStructPointer;
                } else if (retDef === ValueTypeJSON.IndexDataPointer) {
                    retType = ValueType.IndexDataPointer;
                } else if (retDef === ValueTypeJSON.PointerFree) {
                    retType = ValueType.PointerFree;
                } else if (retDef === ValueTypeJSON.PointerAlloc) {
                    retType = ValueType.PointerAlloc;
                } else if (retDef === ValueTypeJSON.PointerAllocSize) {
                    retType = ValueType.PointerAllocSize;
                } else if (retDef === ValueTypeJSON.PointerAllocEnd) {
                    retType = ValueType.PointerAllocEnd;
                } else if (retDef === ValueTypeJSON.PointerTemp) {
                    retType = ValueType.PointerTemp;
                } else if (retDef.startsWith(ValueTypeJSON.PointerPrePrefix)) {
                    const suffix = retDef.substring(ValueTypeJSON.PointerPrePrefix.length);
                    const bytes = Number(suffix);

                    if (isNaN(bytes) || !isFinite(bytes) || bytes <= 0 || bytes > 128 || Math.trunc(bytes) !== bytes) {
                        throw new Error('Invalid pre-allocated pointer byte count');
                    }

                    retType = ValueType.PointerPreStart + bytes - 1;
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