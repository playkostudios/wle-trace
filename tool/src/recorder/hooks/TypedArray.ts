import { type TypedArray } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';

export function injectTypedArrayRecorder(recorder: WLETraceRecorder) {
    // XXX no clean way to get the TypedArray class AFAIK
    injectMethod((Uint8Array.prototype as unknown as { __proto__: any }).__proto__, 'set', {
        beforeHook: (array: TypedArray, _methodName: string, args: any[]) => {
            recorder.recordWASMDMA(array, args[0], args[1] ?? 0);
        },
    });
}