import { type WASM, WonderlandEngine, Material } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimMaterial, guardReclaimMesh, guardReclaimScene, guardReclaimTexture } from '../utils/guardReclaim.js';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { wasmMethodTracer } from '../utils/wasmMethodTracer.js';
import { traceEmitter } from '../utils/traceEmitter.js';
import { sceneDestroyCheck } from '../utils/objectDestroy.js';
import { inSceneLoad } from '../utils/inSceneLoad.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { handleScenePostReplace } from '../utils/handleScenePostReplace.js';

controller.registerFeature('trace:emitter:WonderlandEngine.onSceneLoaded');
controller.registerFeature('debug:dummy-material-ctor-crash');

// XXX _wl_ methods (not _wljs_) are only added after loadRuntime is called. to
//     hook them we have to hook into an init function AND THEN inject to those
//     now-present methods
injectMethod(WonderlandEngine.prototype, '_init', {
    beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
        engine.onSceneLoaded.add(() => {
            traceEmitter('WonderlandEngine.onSceneLoaded');
        });

        const wasm = engine.wasm;

        injectMethod(wasm, '_wl_mesh_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_mesh_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], meshIdx: number) => {
                guardReclaimMesh(engine, meshIdx);
            }
        });

        injectMethod(wasm, '_wl_renderer_addImage', {
            traceHook: controller.guardFunction('trace:WASM._wl_renderer_addImage', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], textureId: number) => {
                guardReclaimTexture(engine, textureId);
            }
        });

        injectMethod(wasm, '_wl_load_scene_bin', {
            beforeHook: (wasm: WASM, _methodName: string, _args: any[]) => {
                sceneDestroyCheck(engine);

                if (inSceneLoad.has(wasm)) {
                    new StyledMessage()
                        .add('Scene load started while another scene is being loaded. wle-trace will not be able to accurately track which Object3D/Component instances were added. This might also be a bug on your end')
                        .print(true, ERR);
                } else {
                    inSceneLoad.set(wasm, [false, engine]);
                }
            },
            traceHook: controller.guardFunction('trace:WASM._wl_load_scene_bin', wasmMethodTracer),
            afterHook: (wasm: WASM, _methodName: string, _args: any[]) => {
                const hadInitEngine = inSceneLoad.get(wasm);
                inSceneLoad.delete(wasm);

                if (!hadInitEngine) {
                    if (controller.isEnabled('debug:bad-scene-load-tracking')) {
                        new StyledMessage()
                            .add('bad Scene.load tracking detected')
                            .print(true, ERR);

                        debugger;
                    }

                    return;
                }

                if (!hadInitEngine[0]) {
                    handleScenePostReplace(engine, 'Scene.load');
                }
            },
            exceptionHook: (wasm: WASM, _methodName: string, _args: any[], _error: unknown) => {
                inSceneLoad.delete(wasm);
            },
        });

        const materialCreateCloneAfterHook = (_wasm: WASM, _methodName: string, _args: any[], materialIdx: number) => {
            if (materialIdx >= 0) {
                // HACK we end up creating 2 Material instances, which is
                //      not ideal, but there is no clean way; it would
                //      require overriding the constructor, which has nasty
                //      side-effects. this will also create an unnecessary
                //      trace for the WASM material definitions getter call
                let material = null;
                try {
                    material = new Material(engine, materialIdx);
                } catch (err) {
                    if (controller.isEnabled('debug:dummy-material-ctor-crash')) {
                        console.error(err);
                        new StyledMessage()
                            .add('dummy material creation failed')
                            .print(true, ERR);

                        debugger;
                    }
                }

                if (material) {
                    guardReclaimMaterial(engine, material);
                }
            }
        };

        injectMethod(wasm, '_wl_material_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_material_create', wasmMethodTracer),
            afterHook: materialCreateCloneAfterHook
        });

        injectMethod(wasm, '_wl_material_clone', {
            traceHook: controller.guardFunction('trace:WASM._wl_material_clone', wasmMethodTracer),
            afterHook: materialCreateCloneAfterHook
        });

        // auto-inject trivial internal calls
        const PROPERTY_DENY_LIST = new Set([ '_wl_mesh_create', '_wl_renderer_addImage', '_wl_load_scene_bin', '_wl_material_create', '_wl_material_clone' ]);

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
