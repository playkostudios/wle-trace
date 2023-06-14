import { type WASM, WonderlandEngine } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimMesh, guardReclaimScene } from '../utils/guardReclaim.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { wasmMethodTracer } from '../utils/wasmMethodTracer.js';
import { traceEmitter } from '../utils/traceEmitter.js';
import { trackedDestroyMark } from '../utils/objectDestroy.js';

controller.registerFeature('trace:emitter:WonderlandEngine.onSceneLoaded');

// XXX _wl_ methods (not _wljs_) are only added after loadRuntime is called. to
//     hook them we have to hook into an init function AND THEN inject to those
//     now-present methods
injectMethod(WonderlandEngine.prototype, '_init', {
    beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
        engine.onSceneLoaded.add(() => {
            traceEmitter('WonderlandEngine.onSceneLoaded');

            // destroy previously created objects and components
            trackedDestroyMark(engine, 'Scene.load');

            // reclaim objects in scene
            guardReclaimScene(engine);
        });

        const wasm = engine.wasm;

        injectMethod(wasm, '_wl_mesh_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_mesh_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], meshIdx: number) => {
                guardReclaimMesh(engine, meshIdx);
            }
        });

        // auto-inject trivial internal calls
        const PROPERTY_DENY_LIST = new Set([ '_wl_mesh_create' ]);

        for (const name of Object.getOwnPropertyNames(wasm)) {
            if (PROPERTY_DENY_LIST.has(name)) {
                continue;
            }

            const descriptor = getPropertyDescriptor(wasm, name);
            if (descriptor.value && (typeof descriptor.value) === 'function') {
                console.debug(descriptor.value)
                injectMethod(wasm, name, {
                    traceHook: controller.guardFunction(`trace:WASM.${name}`, wasmMethodTracer),
                });
            }
        }

        // mark injections as done (some features will be auto-toggled by the
        // user here)
        controller._markInjectionsDone();

        // for some weird reason, the WLE loading screen is a pre-loaded scene.
        // track the current objects in the scene for this specific reason
        guardReclaimScene(engine);
    }
});
