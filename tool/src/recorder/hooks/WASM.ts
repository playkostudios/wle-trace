import { WASM } from '@wonderlandengine/api';
import { injectRecorderHooks } from '../inject/injectRecorderHooks.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectWASMEarlyHook } from '../../common/hooks/WASM.js';
import { wrapTypedArray } from '../inject/wrapTypedArray.js';

export function injectWASMRecorder(recorder: WLETraceRecorder) {
    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        // we only care about preloaded WASM->JS methods
        if (name !== '_wljs_init' && name.startsWith('_wljs_')) {
            injectRecorderHooks(recorder, WASM.prototype, name);
        }
    }

    return injectWASMEarlyHook(recorder, {
        beforeHook: (wasm: WASM, _methodName: string, _args: any[]) => {
            // XXX replace heap with proxies so we can detect index operator
            //     DMA. wrapping is only done when the recording is already
            //     started, but these are created BEFORE the recording starts
            wasm.HEAP8 = wrapTypedArray(recorder, wasm.HEAP8);
            wasm.HEAP16 = wrapTypedArray(recorder, wasm.HEAP16);
            wasm.HEAP32 = wrapTypedArray(recorder, wasm.HEAP32);
            wasm.HEAPU8 = wrapTypedArray(recorder, wasm.HEAPU8);
            wasm.HEAPU16 = wrapTypedArray(recorder, wasm.HEAPU16);
            wasm.HEAPU32 = wrapTypedArray(recorder, wasm.HEAPU32);
            wasm.HEAPF32 = wrapTypedArray(recorder, wasm.HEAPF32);
            wasm.HEAPF64 = wrapTypedArray(recorder, wasm.HEAPF64);
        }
    });
}