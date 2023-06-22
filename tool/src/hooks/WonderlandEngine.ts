import { type WASM, WonderlandEngine, Material } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimMaterial, guardReclaimMesh, guardReclaimScene, guardReclaimTexture } from '../utils/guardReclaim.js';
import { type WLETraceController } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { traceEmitter } from '../utils/traceEmitter.js';
import { sceneDestroyCheck } from '../utils/objectDestroy.js';
import { inSceneLoad } from '../utils/inSceneLoad.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { handleScenePostReplace } from '../utils/handleScenePostReplace.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';

function injectGenericWonderlandEngine(injectCallback: (engine: WonderlandEngine) => void): Promise<WonderlandEngine> {
    return new Promise((resolve, _reject) => {
        // XXX _wl_ methods (not _wljs_) are only added after loadRuntime is
        //     called. to hook them we have to hook into an init function AND
        //     THEN inject to those now-present methods
        injectMethod(WonderlandEngine.prototype, '_init', {
            beforeHook: (engine: WonderlandEngine, _methodName: string, _args: any[]) => {
                injectCallback(engine);

                // mark injections as done (some features will be auto-toggled
                // by the user here)
                console.debug('[wle-trace CONTROLLER] ready; engine loaded, all hooks injected');
                resolve(engine);
            },
        });
    });
}

export async function injectWonderlandEngineRecorder(controller: WLETraceController) {
    await injectGenericWonderlandEngine((engine: WonderlandEngine) => {
        const wasm = engine.wasm;

        for (const name of Object.getOwnPropertyNames(wasm)) {
            if (!name.startsWith('_')) {
                continue;
            }

            const descriptor = getPropertyDescriptor(wasm, name);
            if (descriptor.value && (typeof descriptor.value) === 'function') {
                let beforeHook;
                if (name.startsWith('_wljs_')) {
                    beforeHook = (_wasm: WASM, methodName: string, args: any[]) => {
                        controller.recordWASMCallback(methodName, args);
                    };
                } else {
                    beforeHook = (_wasm: WASM, methodName: string, args: any[]) => {
                        controller.recordWASMCall(methodName, args);
                    };
                }

                injectMethod(wasm, name, { beforeHook });
            }
        }
    });
}

export async function injectWonderlandEngine(controller: WLETraceController): Promise<void> {
    const wasmMethodTracer = makeGlobalObjMethodTracer(controller, 'WASM');

    controller.registerFeature('trace:emitter:WonderlandEngine.onSceneLoaded');
    controller.registerFeature('debug:dummy-material-ctor-crash');

    const engine = await injectGenericWonderlandEngine((engine: WonderlandEngine) => {
        const wasm = engine.wasm;

        engine.onSceneLoaded.add(() => {
            traceEmitter(controller, 'WonderlandEngine.onSceneLoaded');
        });

        injectMethod(wasm, '_wl_mesh_create', {
            traceHook: controller.guardFunction('trace:WASM._wl_mesh_create', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], meshIdx: number) => {
                guardReclaimMesh(controller, engine, meshIdx);
            }
        });

        injectMethod(wasm, '_wl_renderer_addImage', {
            traceHook: controller.guardFunction('trace:WASM._wl_renderer_addImage', wasmMethodTracer),
            afterHook: (_wasm: WASM, _methodName: string, _args: any[], textureId: number) => {
                guardReclaimTexture(controller, engine, textureId);
            }
        });

        injectMethod(wasm, '_wl_load_scene_bin', {
            beforeHook: (wasm: WASM, _methodName: string, _args: any[]) => {
                sceneDestroyCheck(controller, engine);

                if (inSceneLoad.has(wasm)) {
                    new StyledMessage(controller)
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
                        new StyledMessage(controller)
                            .add('bad Scene.load tracking detected')
                            .print(true, ERR);

                        debugger;
                    }

                    return;
                }

                if (!hadInitEngine[0]) {
                    handleScenePostReplace(controller, engine, 'Scene.load');
                }
            },
            exceptionHook: (wasm: WASM, _methodName: string, _args: any[], _error: unknown) => {
                inSceneLoad.delete(wasm);
            },
        });

        const materialCreateCloneAfterHook = (_wasm: WASM, _methodName: string, _args: any[], materialIdx: number) => {
            if (materialIdx >= 0) {
                // HACK we end up creating 2 Material instances, which
                //      is not ideal, but there is no clean way; it
                //      would require overriding the constructor, which
                //      has nasty side-effects. this will also create an
                //      unnecessary trace for the WASM material
                //      definitions getter call
                let material = null;
                try {
                    material = new Material(engine, materialIdx);
                } catch (err) {
                    if (controller.isEnabled('debug:dummy-material-ctor-crash')) {
                        console.error(err);
                        new StyledMessage(controller)
                            .add('dummy material creation failed')
                            .print(true, ERR);

                        debugger;
                    }
                }

                if (material) {
                    guardReclaimMaterial(controller, engine, material);
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
                injectMethod(wasm, name, {
                    traceHook: controller.guardFunction(`trace:WASM.${name}`, wasmMethodTracer),
                });
            }
        }
    });

    // for some weird reason, the WLE loading screen is a pre-loaded
    // scene. track the current objects in the scene for this
    // specific reason
    guardReclaimScene(controller, engine);
}