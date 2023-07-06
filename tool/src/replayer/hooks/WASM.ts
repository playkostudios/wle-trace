import { WASM } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';
import { type WLETraceReplayer } from '../WLETraceReplayer.js';
import { injectWASMEarlyHook } from '../../common/hooks/WASM.js';

export function injectWASMReplayer(replayer: WLETraceReplayer, callback: (wasm: WASM) => void) {
    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        if (name === '_wljs_init' || !name.startsWith('_wljs_')) {
            continue;
        }

        const descriptor = getPropertyDescriptor(WASM.prototype, name);
        if (descriptor.value && (typeof descriptor.value) === 'function') {
            injectMethod(WASM.prototype, name, {
                replaceHook: function (this: WASM, ...args: any[]) {
                    return replayer.markCallbackAsReplayed(name, args);
                },
            });
        }
    }

    return injectWASMEarlyHook(replayer, {
        replaceHook: function (this: WASM, ..._args: any[]) {
            callback(this);
            return; // do nothing. this avoid an extra allocation on init
        }
    });
}