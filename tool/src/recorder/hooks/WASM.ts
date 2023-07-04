import { WASM } from '@wonderlandengine/api';
import { injectRecorderHooks } from '../inject/injectRecorderHooks.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectWASMEarlyHook } from '../../common/hooks/WASM.js';

export function injectWASMRecorder(recorder: WLETraceRecorder) {
    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        // we only care about preloaded WASM->JS methods
        if (name !== '_wljs_init' && name.startsWith('_wljs_')) {
            injectRecorderHooks(recorder, WASM.prototype, name);
        }
    }

    return injectWASMEarlyHook(recorder);
}