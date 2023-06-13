import { type WASM, WonderlandEngine } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimComponent, guardReclaimMesh, guardReclaimObject3DRecursively } from '../utils/guardReclaim.js';
import { origChildrenGetter, origGetComponentsMethod } from './orig-properties.js';
import { trackedComponents } from '../utils/trackedComponents.js';
import { StyledMessage, WARN } from '../StyledMessage.js';
import { trackedObject3Ds } from '../utils/trackedObject3Ds.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';

const wasmMethodTracer = makeGlobalObjMethodTracer('WASM');

// XXX _wl_ methods (not _wljs_) are only added after loadRuntime is called. to
//     hook them we have to hook into an init function AND THEN inject to those
//     now-present methods
injectMethod(WonderlandEngine.prototype, '_init', {
    beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
        engine.onSceneLoaded.add(() => {
            // destroy previously created objects and components
            // HACK objects are no longer valid so we can't use the *DestroyMark
            //      or *DestroyCheck functions.
            for (const comp of trackedComponents.getAll(engine)) {
                if (comp.__wle_trace_destroying_data) {
                    // scene.load called while component was being destroyed
                    // TODO is this the expected behaviour?
                    new StyledMessage()
                        .add('component ', WARN)
                        .addSubMessage(comp.__wle_trace_destroying_data[0])
                        .add(' was being destroyed while scene.load finished; component marked as destroyed, although this might not be the expected behaviour')
                        .print(true, WARN);

                    comp.__wle_trace_destroyed_data = comp.__wle_trace_destroying_data;
                    delete comp.__wle_trace_destroying_data;
                } else if (!comp.__wle_trace_destroyed_data) {
                    comp.__wle_trace_destroyed_data = [new StyledMessage().add('<unavailable Component; destroyed by scene.load>', WARN), null];
                }
            }

            for (const obj of trackedObject3Ds.getAll(engine)) {
                if (obj.__wle_trace_destroying_data) {
                    // scene.load called while object was being destroyed
                    // TODO is this the expected behaviour?
                    const prevPath = obj.__wle_trace_destroying_data[0];
                    new StyledMessage()
                        .add('object ', WARN)
                        .addSubMessage(prevPath)
                        .add(' was being destroyed while scene.load finished; component marked as destroyed, although this might not be the expected behaviour')
                        .print(true, WARN);

                    obj.__wle_trace_destroyed_data = [prevPath, null];
                    delete obj.__wle_trace_destroying_data;
                } else if (!obj.__wle_trace_destroyed_data) {
                    obj.__wle_trace_destroyed_data = [new StyledMessage().add('<unavailable Object3D; destroyed by scene.load>', WARN), null];
                }
            }

            // reclaim objects in scene
            const sceneRoot = engine.wrapObject(0);
            const children = origChildrenGetter.apply(sceneRoot);
            const components = origGetComponentsMethod.apply(sceneRoot);

            for (const comp of components) {
                guardReclaimComponent(comp);
            }

            for (const child of children) {
                guardReclaimObject3DRecursively(child);
            }
        });

        const wasm = engine.wasm;

        injectMethod(wasm, '_wl_mesh_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_mesh_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], meshIdx: number) => {
                guardReclaimMesh(engine, meshIdx);
            }
        });

        // auto-inject trivial internal calls
        // HACK objectId is not handled because it's used internally in the WLE API
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

        controller._markInjectionsDone();
    }
});
