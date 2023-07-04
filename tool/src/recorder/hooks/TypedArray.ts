import { type TypedArray } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { replaceTypedArrayConstructor } from '../inject/replaceTypedArrayConstructor.js';

export function injectTypedArrayRecorder(recorder: WLETraceRecorder) {
    replaceTypedArrayConstructor(recorder, Int8Array);
    replaceTypedArrayConstructor(recorder, Int16Array);
    replaceTypedArrayConstructor(recorder, Int32Array);
    replaceTypedArrayConstructor(recorder, Uint8Array);
    replaceTypedArrayConstructor(recorder, Uint16Array);
    replaceTypedArrayConstructor(recorder, Uint32Array);
    replaceTypedArrayConstructor(recorder, Uint8ClampedArray);
    replaceTypedArrayConstructor(recorder, Float32Array);
    replaceTypedArrayConstructor(recorder, Float64Array);

    // XXX no clean way to get the TypedArray class AFAIK
    injectMethod((Uint8Array.prototype as unknown as { __proto__: any }).__proto__, 'set', {
        beforeHook: (array: TypedArray, _methodName: string, args: any[]) => {
            recorder.recordWASMDMA(array, args[0], args[1] ?? 0);
        },
    });
}