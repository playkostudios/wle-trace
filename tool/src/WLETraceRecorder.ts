import { type TypedArrayCtor, type TypedArray, type WonderlandEngine } from '@wonderlandengine/api';
import { SpecialRetType, type AnyType, type ArgType, type MethodTypeMap, ValueType, MAGIC, REPLAY_FORMAT_VERSION, RetType, CallTypeJSON, ValueTypeJSON, MethodTypeMapsJSON } from './replay/common.js';
import { WLETraceSentinelBase } from './WLETraceSentinelBase.js';

export class WLETraceRecorder extends WLETraceSentinelBase {
    private recordBuffer: null | ArrayBuffer[] = [];
    private engine: WonderlandEngine | null = null;
    private stringDictionary = new Array<string>();
    private callTypeMap: MethodTypeMap = new Map<number, ArgType[]>();
    private callbackTypeMap: MethodTypeMap = new Map<number, AnyType[]>();
    stopAndDownloadOnSentinel = false;

    constructor() {
        super();

        // -- setup default sentinel handler --
        this.addSentinelHandler(() => {
            if (this.stopAndDownloadOnSentinel && this.recording) {
                this.stopAndDownload();
            }
        });
    }

    get recording() {
        return this.engine !== null && this.recordBuffer !== null;
    }

    start(engine: WonderlandEngine) {
        if (this.engine) {
            throw new Error('Already recording');
        } else if (!this.recordBuffer) {
            throw new Error("Can't reuse recorder");
        }

        this.engine = engine;
        console.debug("[wle-trace RECORDER] Started recording. Don't forget to stop recording by calling recorder.stop()");
    }

    stop(): Blob {
        if (!this.recording) {
            throw new Error("Can't stop recording; not recording");
        }

        console.debug('[wle-trace RECORDER] Stopped recording');
        const recordBuffer = this.recordBuffer!;
        this.recordBuffer = null;
        this.engine = null;

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
        this.encodeMethodTypeMap(chunks, this.callTypeMap);
        this.callTypeMap.clear();

        // encode callback type map
        this.encodeMethodTypeMap(chunks, this.callbackTypeMap);
        this.callbackTypeMap.clear();

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
        link.download = `demo-${Date.now()}.wletdf`;
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

    private recordValue(val: unknown, expectedType: AnyType) {
        let enc;
        const valType = typeof val;
        if (expectedType === SpecialRetType.Void) {
            if (val !== undefined) {
                // console.warn(`[wle-trace RECORDER] ignoring value; void expected, but got a non-undefined value`);
            }

            return;
        } else if (expectedType === ValueType.Boolean) {
            if (valType !== 'boolean') {
                // console.warn(`[wle-trace RECORDER] casting value to boolean; boolean expected`);
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

                    // console.warn(`[wle-trace RECORDER] casting value to number; number expected`);
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
                // console.warn(`[wle-trace RECORDER] casting value to string; string expected`);
            }

            enc = new Uint32Array([ this.getStringIdx(val as string) ]);
        } else {
            throw new Error('Invalid expected type');
        }

        this.recordBuffer!.push(enc);
    }

    recordWASMGeneric(isCall: boolean, methodName: string, args: any[], threw: boolean, retVal?: any) {
        if (!this.recordBuffer || this.engine === null) {
            return;
        }

        // console.debug(`[wle-trace RECORDER] record call${isCall ? '' : 'back'}`, methodName);

        // get index of method name
        const methodIdx = this.getStringIdx(methodName);

        // prepare header of method call(back). format:
        // bytes; desc
        // -----------
        // 1    ; eventType (0 if callback, 1 if call, 2 if throwing callback, 3 if throwing call, 4 if dma (not used here))
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
                this.recordValue(retVal, thisMethodTypeMap[0]);
            }

            // double-check that arg types are compatible and encode
            // XXX first index is reserved for return types in callbacks
            let mapOffset = isCall ? 0 : 1;
            const argCount = args.length;
            for (let i = 0; i < argCount; i++) {
                this.recordValue(args[i], thisMethodTypeMap[i + mapOffset]);
            }
        } else {
            console.warn(`[wle-trace RECORDER] "${methodName}" is not a registered call${isCall ? '' : 'back'}. Guessing argument types${isCall ? '' : ' and return type'} from values`);
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
                console.warn(`[wle-trace RECORDER] first call${isCall ? '' : 'back'} for method "${methodName}" threw; assuming void return type`);
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
                    enc = new Uint32Array([ this.getStringIdx(retType) ]);
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
                    enc = new Uint32Array([ this.getStringIdx(argType) ]);
                } else {
                    debugger;
                    throw new Error(`Unexpected argument type in WASM call${isCall ? '' : 'back'}`);
                }

                this.recordBuffer.push(enc);
            }

            methodTypeMap.set(methodIdx, thisMethodTypeMap);
        }
    }

    recordWASMDMA(dst: TypedArray, src: ArrayLike<number>, offset: number) {
        if (!this.recordBuffer || this.engine === null) {
            return;
        }

        // verify that destination is the heap
        const dstBuf = dst.buffer;
        offset += dst.byteOffset;

        if ((dst.byteLength - offset) <= 0 || src.length === 0 || dstBuf !== this.engine.wasm.HEAP8?.buffer) {
            return;
        }

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

        // prepare header of dma set. format:
        // bytes; desc
        // -----------
        // 1    ; eventType (0 if callback (not used here), 1 if call (not used here), 2 if throwing callback (not used here), 3 if throwing call (not used here), 4 if dma)
        // 4    ; offset
        // 4    ; buffer length
        // console.debug('[wle-trace RECORDER] record dma', out.byteLength, '@', offset);
        this.recordBuffer.push(new Uint8Array([ 4 ]));
        this.recordBuffer.push(new Uint32Array([ offset, srcCopyCast.byteLength ]));

        // add buffer to replay buffer
        this.recordBuffer.push(srcCopyCast);
    }

    private encodeMethodTypeMap(chunks: ArrayBuffer[], methodTypeMap: MethodTypeMap) {
        // method type map size
        chunks.push(new Uint32Array([methodTypeMap.size]));

        // method types
        for (const [methodIdx, argTypes] of methodTypeMap) {
            chunks.push(new Uint32Array([ methodIdx, argTypes.length ]));
            chunks.push(new Uint8Array(argTypes));
        }
    }

    registerCallMethod(methodName: string, argTypes: ArgType[], retType: RetType) {
        this.callTypeMap.set(this.getStringIdx(methodName), [retType, ...argTypes]);
    }

    registerCallbackMethod(methodName: string, argTypes: ArgType[], retType: RetType) {
        this.callbackTypeMap.set(this.getStringIdx(methodName), [retType, ...argTypes]);
    }

    private registerTypeMapFromJSON(isCallback: boolean, record: Record<string, CallTypeJSON>): void {
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