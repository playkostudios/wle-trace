import { type WASM } from '@wonderlandengine/api';
import { ReplayBuffer } from './ReplayBuffer.js';
import { type MethodTypeMap } from '../common/types/MethodTypeMap.js';
import { ValueType } from '../common/types/ValueType.js';
import { ReplayV1AllocationMap } from './ReplayV1AllocationMap.js';
import { EventType } from '../common/types/EventType.js';

export class ReplayBufferV1 implements ReplayBuffer {
    private bufferView: DataView;
    private offset = 0;
    private stringDictionary = new Array<string>();
    private callTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private callbackTypeMap: MethodTypeMap = new Map<number, ValueType[]>();
    private allocMap: ReplayV1AllocationMap;
    private callStack = new Array<[methodIdx: number, isCall: boolean]>();
    private callbackRetStack = new Array<[threw: boolean, retVal?: unknown]>();
    private looseEndCallbacks = new Array<() => void>();

    get ended(): boolean {
        return this.offset >= (this.buffer.byteLength - this.headerSize);
    }

    constructor(private wasm: WASM, private buffer: ArrayBuffer, private headerSize: number) {
        this.bufferView = new DataView(buffer, headerSize);
        this.allocMap = new ReplayV1AllocationMap(wasm);

        // parse dictionary
        this.stringDictionary.length = 0;
        const dictSize = this.bufferView.getUint32(this.offset);
        this.offset += 4;
        const textDecoder = new TextDecoder();

        for (let i = 0; i < dictSize; i++) {
            const strLen = this.bufferView.getUint32(this.offset);
            this.offset += 4;
            this.stringDictionary.push(textDecoder.decode(new Uint8Array(buffer, this.offset + headerSize, strLen)));
            this.offset += strLen;
        }

        // parse call type map
        this.callTypeMap.clear();
        this.decodeMethodTypeMap(this.callTypeMap);

        // parse callback type map
        this.callbackTypeMap.clear();
        this.decodeMethodTypeMap(this.callbackTypeMap);
    }

    markCallbackAsReplayed(methodName: string, args: unknown[]): unknown {
        // console.debug(`markCallbackAsReplayed: offset 0x${(this.offset + this.headerSize).toString(16)}`);
        const eventType = this.bufferView.getUint8(this.offset);

        if (eventType !== EventType.Callback) {
            debugger;
            throw new Error('Unexpected WASM callback; no callback expected');
        }

        this.offset++;

        // parse and verify method idx
        const methodIdx = this.stringDictionary.indexOf(methodName);

        // parse method name
        if (methodIdx !== this.bufferView.getUint32(this.offset)) {
            throw new Error('Unexpected WASM callback; different method expected');
        }

        this.offset += 4;

        // get method type
        const types = this.callbackTypeMap.get(methodIdx);
        if (types === undefined) {
            throw new Error('WASM callback matches, but callback is not registered in type map');
        }

        // parse and verify argument values
        const expectedArgCount = types.length - 1;
        const argCount = args.length;

        if (argCount !== expectedArgCount) {
            throw new Error(`Unexpected WASM callback argument count; expected ${expectedArgCount}, got ${argCount}`);
        }

        for (let i = 0; i < expectedArgCount; i++) {
            const arg = args[i];
            const expectedArg = this.decodeValue(types[i + 1] as ValueType);

            // TODO
            // if (arg !== expectedArg) {
            //     console.error('[wle-trace REPLAYER] Argument mismatch; expected', expectedArg, ', got', arg);
            //     throw new Error(`Unexpected WASM callback argument ${i}; see details in console`);
            // }
        }

        // continue replay
        this.callStack.push([methodIdx, false]);
        this.continue();

        // handle result (throw or return)
        const callbackResult = this.callbackRetStack.pop();
        if (callbackResult === undefined) {
            throw new Error('Callback stack is empty');
        }

        const [threw, retVal] = callbackResult;

        // console.debug('callback done', methodName);

        if (this.callStack.length === 0 && this.callbackRetStack.length === 0 && (this.hasNonCallbackNext() || this.ended)) {
            // XXX loose end! queue up an event via a timeout to continue the
            //     playback
            // console.debug('loose end from callback done', methodName);
            setTimeout(() => {
                for (const callback of this.looseEndCallbacks) {
                    callback();
                }
            }, 0);
        }

        if (threw) {
            throw new Error('Fake error; this callback is meant to throw');
        } else {
            // do memory allocations
            this.allocMap.handleCallAllocationChanges([retVal, ...args], types);

            return retVal;
        }
    }

    private hasNonCallbackNext() {
        if (this.ended) {
            return false;
        }

        return this.bufferView.getUint8(this.offset) !== EventType.Callback;
    }

    continue(): boolean {
        const end = this.buffer.byteLength - this.headerSize;

        while (this.offset < end) {
            // console.debug(`continue: offset 0x${(this.offset + this.headerSize).toString(16)}`);
            const eventType: EventType = this.bufferView.getUint8(this.offset);
            this.offset++;

            if (eventType === EventType.Callback) {
                // XXX we will be visiting this part of the buffer again, go
                //     back
                const methodIdx = this.bufferView.getUint32(this.offset);
                const methodName = this.stringDictionary[methodIdx];
                // console.debug('replay waiting for callback...', methodName, 'str idx', methodIdx);
                this.offset--;
                break; // callback, wait for a callback-as-replayed mark
            } else if (eventType === EventType.Call) {
                // wasm call
                // parse method name
                const methodIdx = this.bufferView.getUint32(this.offset);
                this.offset += 4;

                const methodName = this.stringDictionary[methodIdx];
                if (methodName === undefined) {
                    throw new Error(`Missing string index ${methodIdx} for method name`);
                }

                // get method type
                const types = this.callTypeMap.get(methodIdx);
                if (types === undefined) {
                    throw new Error('WASM call is not registered in type map');
                }

                // parse arguments
                const argCount = types.length - 1;
                const args = new Array(argCount);

                for (let i = 0; i < argCount; i++) {
                    args[i] = this.decodeValue(types[i + 1]);
                }

                // add to call stack
                this.callStack.push([methodIdx, true]);

                // do call
                // console.debug('replay call', methodName, ...args);
                let threw = false;
                let retVal;
                let err;

                try {
                    retVal = (this.wasm as unknown as Record<string, (...args: any[]) => any>)[methodName](...args);
                } catch (e) {
                    err = e;
                    threw = true;
                }

                // pop from call stack
                const stackFrame = this.callStack.pop();
                if (stackFrame === undefined) {
                    throw new Error('Stack frame missing');
                }

                const [frameMethodIdx, frameIsCall] = stackFrame;

                if (!frameIsCall || frameMethodIdx !== methodIdx) {
                    throw new Error('Stack frame mismatch');
                }

                // there should be a return or throw now
                const nextEventType = this.bufferView.getUint8(this.offset);
                this.offset++;

                if (nextEventType === EventType.Return) {
                    if (threw) {
                        console.error('[wle-trace REPLAYER] Call unexpectedly threw an exception:', err);
                        throw new Error('Unexpected call throw');
                    }

                    const retType = types[0];
                    if (retType !== ValueType.Void) {
                        const expectedRetVal = this.decodeValue(retType);
                        // TODO verify return value
                    }
                } else if (nextEventType === EventType.Throw) {
                    if (!threw) {
                        console.error("[wle-trace REPLAYER] Call unexpectedly didn't throw an exception");
                        throw new Error('Unexpected no-throw');
                    }
                } else {
                    throw new Error('Unexpected event type after actual call leave');
                }

                // do memory allocations
                this.allocMap.handleCallAllocationChanges([retVal, ...args], types);
            } else if (eventType === EventType.Return) {
                const stackFrame = this.callStack.pop();
                if (stackFrame === undefined) {
                    throw new Error('Unexpected return event');
                }

                const [methodIdx, isCall] = stackFrame;

                if (isCall) {
                    throw new Error('Unexpected call return event');
                } else {
                    const thisMethodMap = this.callbackTypeMap.get(methodIdx);
                    if (thisMethodMap === undefined) {
                        throw new Error('Callback has no method type map');
                    }

                    const retVal = this.decodeValue(thisMethodMap[0]);
                    this.callbackRetStack.push([false, retVal]);
                    break;
                }
            } else if (eventType === EventType.Throw) {
                const stackFrame = this.callStack.pop();
                if (stackFrame === undefined) {
                    throw new Error('Unexpected throw event');
                }

                const [_methodIdx, isCall] = stackFrame;

                if (isCall) {
                    throw new Error('Unexpected call throw event');
                } else {
                    this.callbackRetStack.push([true, undefined]);
                }
                break;
            } else if (eventType === EventType.MultiDMA) {
                // multi-byte dma
                const byteOffset = this.decodeAllocRef();
                const byteLength = this.bufferView.getUint32(this.offset);
                this.offset += 4;
                // console.debug('replay dma', byteLength, 'bytes @', byteOffset, ';end=', byteOffset + byteLength, '; heap8 end=', this.wasm.HEAPU8.byteLength);
                this.wasm.HEAPU8.set(new Uint8Array(this.buffer, this.offset + this.headerSize, byteLength), byteOffset);
                this.offset += byteLength;
            } else if (eventType >= EventType.IndexDMAu8 && eventType <= EventType.IndexDMAf64) {
                // single-value dma
                const byteOffset = this.decodeAllocRef();
                const heapBuf = this.wasm.HEAP8.buffer;
                const heapView = new DataView(heapBuf);

                if (eventType === EventType.IndexDMAu8) {
                    heapView.setUint8(byteOffset, this.bufferView.getUint8(this.offset));
                    this.offset += 1;
                } else if (eventType === EventType.IndexDMAu16) {
                    heapView.setUint16(byteOffset, this.bufferView.getUint16(this.offset));
                    this.offset += 2;
                } else if (eventType === EventType.IndexDMAu32) {
                    heapView.setUint32(byteOffset, this.bufferView.getUint32(this.offset));
                    this.offset += 4;
                } else if (eventType === EventType.IndexDMAi8) {
                    heapView.setInt8(byteOffset, this.bufferView.getInt8(this.offset));
                    this.offset += 1;
                } else if (eventType === EventType.IndexDMAi16) {
                    heapView.setInt16(byteOffset, this.bufferView.getInt16(this.offset));
                    this.offset += 2;
                } else if (eventType === EventType.IndexDMAi32) {
                    heapView.setInt32(byteOffset, this.bufferView.getInt32(this.offset));
                    this.offset += 4;
                } else if (eventType === EventType.IndexDMAf32) {
                    heapView.setFloat32(byteOffset, this.bufferView.getFloat32(this.offset));
                    this.offset += 4;
                } else {
                    heapView.setFloat64(byteOffset, this.bufferView.getFloat64(this.offset));
                    this.offset += 8;
                }
            } else {
                eventType;
                debugger;
                throw new Error('unknown event type');
            }
        }

        return this.offset < end;
    }

    private decodeAllocRef(): number {
        const allocID = this.bufferView.getUint32(this.offset);
        this.offset += 4;

        if (allocID === 0) {
            throw new Error('Decoded alloc ref with ID 0');
        }

        const relOffset = this.bufferView.getUint32(this.offset);
        this.offset += 4;
        return this.allocMap.getAbsoluteOffset(allocID - 1, relOffset);
    }

    private decodeValue(type: ValueType): unknown {
        let val;

        switch (type) {
            case ValueType.Uint32:
            case ValueType.MeshAttributeMeshIndex:
            case ValueType.PointerAllocSize:
                val = this.bufferView.getUint32(this.offset);
                this.offset += 4;
                break;
            case ValueType.Int32:
                val = this.bufferView.getInt32(this.offset);
                this.offset += 4;
                break;
            case ValueType.Float32:
                val = this.bufferView.getFloat32(this.offset);
                this.offset += 4;
                break;
            case ValueType.Float64:
                val = this.bufferView.getFloat64(this.offset);
                this.offset += 8;
                break;
            case ValueType.Boolean:
            case ValueType.MeshAttributeStructPointer:
            case ValueType.IndexDataPointer:
            case ValueType.PointerAlloc:
            case ValueType.PointerAllocEnd:
                val = this.bufferView.getUint8(this.offset) !== 0;
                this.offset += 1;
                break;
            case ValueType.String:
            {
                const strIdx = this.bufferView.getUint32(this.offset);
                val = this.stringDictionary[strIdx];
                if (val === undefined) {
                    throw new Error(`Missing string index ${strIdx} for value`);
                }

                this.offset += 4;
                break;
            }
            case ValueType.Pointer:
            case ValueType.IndexDataStructPointer:
            {
                const allocID = this.bufferView.getUint32(this.offset);
                this.offset += 4;

                if (allocID === 0) {
                    val = 0;
                } else {
                    const relOffset = this.bufferView.getUint32(this.offset);
                    this.offset += 4;
                    val = this.allocMap.getAbsoluteOffset(allocID - 1, relOffset);
                }
                break;
            }
            case ValueType.PointerFree:
            {
                const allocID = this.bufferView.getUint32(this.offset);
                this.offset += 4;

                if (allocID === 0) {
                    val = null;
                } else {
                    val = this.allocMap.getAbsoluteOffset(allocID - 1, 0);
                }
                break;
            }
            case ValueType.PointerTemp:
            case ValueType.Void:
                // XXX nothing
                break;
            default:
                if (type < ValueType.PointerPreStart) {
                    throw new Error(`Unknown ValueType: ${type}`);
                }
        }

        return val;
    }

    private decodeType(): ValueType {
        const type = this.bufferView.getUint8(this.offset);
        this.offset++;
        return type;
        // TODO sanitize
    }

    private decodeMethodTypeMap(methodTypeMap: MethodTypeMap) {
        // parse map size
        const size = this.bufferView.getUint32(this.offset);
        this.offset += 4;

        for (let m = 0; m < size; m++) {
            const methodIdx = this.bufferView.getUint32(this.offset);
            this.offset += 4;
            const retArgCount = this.bufferView.getUint32(this.offset);
            this.offset += 4;

            if (retArgCount < 1) {
                throw new Error('Expected at least one AnyType for the return value');
            }

            const types = [this.decodeType()];
            const argCount = retArgCount - 1;

            for (let a = 0; a < argCount; a++) {
                types.push(this.decodeType());
            }

            methodTypeMap.set(methodIdx, types);
        }
    }

    registerLooseEndCallback(callback: () => void): void {
        this.looseEndCallbacks.push(callback);
    }
}