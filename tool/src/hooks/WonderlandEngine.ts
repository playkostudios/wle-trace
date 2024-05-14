import { type WASM, WonderlandEngine, Material, MaterialManager } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimComponentAndResources, guardReclaimMaterial, guardReclaimMesh, guardReclaimScene, guardReclaimTexture } from '../utils/guardReclaim.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { wasmMethodTracer } from '../utils/wasmMethodTracer.js';
import { traceEmitter } from '../utils/traceEmitter.js';
import { sceneDestroyCheck } from '../utils/objectDestroy.js';
import { inSceneLoad } from '../utils/inSceneLoad.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { handleScenePostReplace } from '../utils/handleScenePostReplace.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { TracedObject3D } from '../types/TracedObject3D.js';

controller.registerFeature('trace:emitter:WonderlandEngine.onSceneLoaded');
controller.registerFeature('debug:dummy-material-ctor-crash');

export const wasmToEngine = new WeakMap<WASM, WonderlandEngine>();

injectMethod(WonderlandEngine.prototype, 'loadMainSceneFromBuffer', {
    beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
        // XXX destroy only resources. objects and components are only destroyed
        //     in Scene.destroy
        // TODO destroy textures, etc...
        engine;
    },
});

// TODO move this
injectMethod(MaterialManager.prototype, '_wrapInstance', {
    traceHook: controller.guardFunction('trace:MaterialManager._wrapInstance', wasmMethodTracer),
    beforeHook: (mgr: MaterialManager, _methodName: string, args: any[]) => {
        guardReclaimMaterial(mgr.engine, args[0]);
    }
});

// XXX _wl_ methods (not _wljs_) are only added after loadRuntime is called. to
//     hook them we have to hook into an init function AND THEN inject to those
//     now-present methods
injectMethod(WonderlandEngine.prototype, '_init', {
    beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
        engine.onSceneLoaded.add(() => {
            traceEmitter('WonderlandEngine.onSceneLoaded');
        });

        const wasm = engine.wasm;
        wasmToEngine.set(wasm, engine);

        injectMethod(wasm, '_wl_mesh_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_mesh_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], meshIdx: number) => {
                guardReclaimMesh(engine, meshIdx);
            }
        });

        injectMethod(wasm, '_wl_texture_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_texture_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], textureId: number) => {
                guardReclaimTexture(engine, textureId);
            }
        });

        injectMethod(wasm, '_wl_object_add_component', {
            traceHook: controller.guardFunction('trace:WASM._wl_object_add_component', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, args: any[], componentId: number) => {
                const obj = engine.wrapObject(args[0]);
                guardReclaimComponentAndResources(obj.scene._components.wrapAny(args[1], componentId) as TracedComponent, obj as unknown as TracedObject3D);
            }
        });

        // auto-inject trivial internal calls
        const PROPERTY_DENY_LIST = new Set([ '_wl_mesh_create', '_wl_texture_create', '_wl_material_create', '_wl_material_clone', '_wl_object_add_component' ]);

        for (const name of Object.getOwnPropertyNames(wasm)) {
            if (PROPERTY_DENY_LIST.has(name)) {
                continue;
            }

            const descriptor = getPropertyDescriptor(wasm, name);
            if (descriptor.value && (typeof descriptor.value) === 'function') {
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
