import { type WASM } from '@wonderlandengine/api';
import { ValueType, type AnyType, type ArgType, type MethodTypeMap, SpecialRetType, VALUE_TYPE_MAX, SPECIAL_TYPE_MIN } from './common.js';
import { ReplayBuffer } from './ReplayBuffer.js';

export class ReplayBufferV1 implements ReplayBuffer {
    private bufferView: DataView;
    private offset = 0;
    private stringDictionary = new Array<string>();
    private callTypeMap: MethodTypeMap = new Map<number, ArgType[]>();
    private callbackTypeMap: MethodTypeMap = new Map<number, AnyType[]>();

    get ended(): boolean {
        return this.offset >= this.buffer.byteLength;
    }

    constructor(private wasm: WASM, private buffer: ArrayBuffer, private headerSize: number) {
        this.bufferView = new DataView(buffer, headerSize);

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
        const eventType = this.bufferView.getUint8(this.offset);

        if (eventType !== 0 && eventType !== 2) {
            throw new Error('Unexpected WASM callback; no callback expected');
        }

        this.offset++;
        const threw = eventType === 2;

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

        // parse return value
        let retVal;
        if (!threw) {
            const retType = types[0];
            if (retType !== SpecialRetType.Void) {
                retVal = this.decodeValue(retType);
            }
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

            if (arg !== expectedArg) {
                console.error('[wle-trace REPLAYER] Argument mismatch; expected', expectedArg, ', got', arg);
                throw new Error(`Unexpected WASM callback argument ${i}; see details in console`);
            }
        }

        return retVal;
    }

    continue(): boolean {
        const end = this.buffer.byteLength;
        while (this.offset < end) {
            const eventType = this.bufferView.getUint8(this.offset);
            this.offset++;

            if (eventType === 0 || eventType === 2) {
                // XXX we will be visiting this part of the buffer again, go
                //     back
                const methodIdx = this.bufferView.getUint32(this.offset);
                const methodName = this.stringDictionary[methodIdx];
                console.debug('replay waiting for callback...', methodName, 'str idx', methodIdx);
                this.offset--;
                break; // callback, wait for a callback-as-replayed mark
            } else if (eventType === 1 || eventType === 3) {
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

                // parse expected return value
                let hasRetValue = eventType !== 3 && types[0] !== SpecialRetType.Void;
                let expectedRetVal;

                if (hasRetValue) {
                    expectedRetVal = this.decodeValue(types[0] as ValueType);
                }

                // parse arguments
                const argCount = types.length - 1;
                const args = new Array(argCount);

                for (let i = 0; i < argCount; i++) {
                    args[i] = this.decodeValue(types[i + 1] as ValueType);
                }

                // do call
                console.debug('replay call', methodName, expectedRetVal, ...args);
                const retVal = (this.wasm as unknown as Record<string, (...args: any[]) => any>)[methodName](...args);

                // verify return value
                if (hasRetValue && retVal !== expectedRetVal) {
                    console.error('[wle-trace REPLAYER] Return value mismatch; expected', expectedRetVal, ', got', retVal);
                    throw new Error('Unexpected WASM return value; see console for details');
                }
            } else if (eventType === 4) {
                // dma
                const byteOffset = this.bufferView.getUint32(this.offset);
                this.offset += 4;
                const byteLength = this.bufferView.getUint32(this.offset);
                this.offset += 4;
                console.debug('replay dma', byteLength, 'bytes @', byteOffset, ';end=', byteOffset + byteLength, '; heap8 end=', this.wasm.HEAPU8.byteLength);
                this.wasm.HEAPU8.set(new Uint8Array(this.buffer, this.offset + this.headerSize, byteLength), byteOffset);
                this.offset += byteLength;
            } else {
                debugger;
                throw new Error('unknown event type');
            }
        }

        return this.offset < end;
    }

    private decodeValue(type: ValueType): unknown {
        let val;

        switch (type) {
            case ValueType.Uint32:
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
            case ValueType.Pointer:
                val = this.bufferView.getUint32(this.offset);
                this.offset += 4;

                if (val === 0) {
                    val = null;
                }
                break;
            case ValueType.Boolean:
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
            default:
                throw new Error(`Unknown ValueType: ${type}`);
        }

        return val;
    }

    private decodeAnyType(allowSpecial: true): AnyType;
    private decodeAnyType(allowSpecial: false): ValueType;
    private decodeAnyType(allowSpecial: boolean): AnyType {
        const type = this.bufferView.getUint8(this.offset);
        this.offset++;

        // sanitise
        if (allowSpecial) {
            if (type > VALUE_TYPE_MAX && type < SPECIAL_TYPE_MIN) {
                throw new Error(`Unknown AnyType: ${type}`);
            }

            return type as AnyType;
        } else {
            if (type > VALUE_TYPE_MAX) {
                throw new Error(`Unknown ValueType: ${type}`);
            }

            return type as ValueType;
        }
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

            const types = [this.decodeAnyType(true)];
            const argCount = retArgCount - 1;

            for (let a = 0; a < argCount; a++) {
                types.push(this.decodeAnyType(false));
            }

            methodTypeMap.set(methodIdx, types);
        }
    }
}