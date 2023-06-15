import { WASM } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { wasmMethodTracer } from '../utils/wasmMethodTracer.js';
import { inSceneLoad } from '../utils/inSceneLoad.js';
import { handleScenePostReplace } from '../utils/handleScenePostReplace.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { inAddComponent } from '../utils/inAddComponent.js';
import { guardReclaimComponent } from '../utils/guardReclaim.js';

// try to detect when a scene.load is actually done (between create and init)
injectMethod(WASM.prototype, '_wljs_component_init', {
    beforeHook: (wasm: WASM, _methodName: string, _args: any[]) => {
        const hadInitEngine = inSceneLoad.get(wasm);
        if (hadInitEngine) {
            if (hadInitEngine[0] === false) {
                const engine = hadInitEngine[1];
                inSceneLoad.set(wasm, [true, engine])
                handleScenePostReplace(engine, 'Scene.load');
            }
        }
    },
    traceHook: controller.guardFunction('trace:WASM._wljs_component_init', wasmMethodTracer),
});

// try to detect when a object.addComponent is actually done (reclaim before
// init is called)
injectMethod(WASM.prototype, '_wljs_component_create', {
    afterHook: (wasm: WASM, _methodName: string, _args: any[], comp: TracedComponent) => {
        const hadInitEngine = inSceneLoad.get(wasm);
        if (hadInitEngine && hadInitEngine[0] === false) {
            return;
        }

        inAddComponent.delete(comp.engine);
        guardReclaimComponent(comp);
    },
    traceHook: controller.guardFunction('trace:WASM._wljs_component_create', wasmMethodTracer),
});

// auto-inject trivial internal WASM calls
// XXX this won't inject any of the _wl_* methods... because they aren't loaded
//     yet. that is done on engine _init (check WonderlandEngine.ts)
const PROPERTY_DENY_LIST = new Set([ 'constructor', '_wljs_component_init', '_wljs_component_create' ]);

for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(WASM.prototype, name);
    if (descriptor.value && (typeof descriptor.value) === 'function') {
        injectMethod(WASM.prototype, name, {
            traceHook: controller.guardFunction(`trace:WASM.${name}`, wasmMethodTracer),
        });
    }
}