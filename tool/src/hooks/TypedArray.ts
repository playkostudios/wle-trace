import { type TypedArray } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { injectMethod } from '../inject/injectMethod.js';

export function injectTypedArrayRecorder(controller: WLETraceController) {
    // XXX no clean way to get the TypedArray class AFAIK
    injectMethod((Uint8Array.prototype as unknown as { __proto__: any }).__proto__, 'set', {
        beforeHook: (array: TypedArray, _methodName: string, args: any[]) => {
            controller.recordWASMDMA(array, args[0], args[1] ?? 0);
        },
    });
}