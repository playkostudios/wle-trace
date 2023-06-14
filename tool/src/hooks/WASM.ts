import { WASM } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { wasmMethodTracer } from '../utils/wasmMethodTracer.js';

// auto-inject trivial internal WASM calls
// XXX this won't inject any of the _wl_* methods... because they aren't loaded
//     yet. that is done on engine _init (check WonderlandEngine.ts)
const PROPERTY_DENY_LIST = new Set([ 'constructor' ]);

for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(WASM.prototype, name);
    if (descriptor.value && (typeof descriptor.value) === 'function') {
        console.debug(descriptor.value)
        injectMethod(WASM.prototype, name, {
            traceHook: controller.guardFunction(`trace:WASM.${name}`, wasmMethodTracer),
        });
    }
}
