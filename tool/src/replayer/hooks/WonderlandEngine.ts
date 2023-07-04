import { type WASM } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type WLETraceReplayer } from '../WLETraceReplayer.js';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';

export function immediatelyInjectWonderlandEngineReplayer(replayer: WLETraceReplayer): void {
    const wasm = replayer.wasm;

    for (const name of Object.getOwnPropertyNames(wasm)) {
        if (!name.startsWith('_wljs_')) {
            continue;
        }

        const descriptor = getPropertyDescriptor(wasm, name);
        if (descriptor.value && (typeof descriptor.value) === 'function') {
            injectMethod(wasm, name, {
                replaceHook: function (this: WASM, ...args: any[]) {
                    return replayer.markCallbackAsReplayed(name, args);
                },
            });
        }
    }
}