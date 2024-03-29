import { Object3D, Scene } from '@wonderlandengine/api';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { guardReclaimObject3D, guardReclaimObject3DRecursively } from '../utils/guardReclaim.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';
import { type WLETraceController } from '../WLETraceController.js';
import { sceneDestroyCheck, trackedDestroyMark } from '../utils/objectDestroy.js';

export function injectScene(controller: WLETraceController) {
    const sceneMethodTracer = makeGlobalObjMethodTracer(controller, 'Scene');

    injectMethod(Scene.prototype, 'addObject', {
        traceHook: controller.guardFunction('trace:Scene.addObject', sceneMethodTracer),
        afterHook: (_scene: Scene, _methodName: string, _args: any[], newObj: TracedObject3D) => {
            guardReclaimObject3D(controller, newObj);
        }
    });

    injectMethod(Scene.prototype, 'addObjects', {
        traceHook: controller.guardFunction('trace:Scene.addObjects', sceneMethodTracer),
        afterHook: (_scene: Scene, _methodName: string, _args: any[], newObjs: TracedObject3D[]) => {
            for (const newObj of newObjs) {
                guardReclaimObject3D(controller, newObj);
            }
        }
    });

    // XXX for scene reset tracking logic, check _wl_load_scene_bin hook, as well as
    //     _wljs_component_init; there is no clean way to know when the objects are
    //     added but not initialized in scene.load
    injectMethod(Scene.prototype, 'load', {
        traceHook: controller.guardFunction('trace:Scene.load', sceneMethodTracer),
    });

    injectMethod(Scene.prototype, 'append', {
        traceHook: controller.guardFunction('trace:Scene.append', sceneMethodTracer),
        afterHook: (_scene: Scene, _methodName: string, _args: any[], resultPromise: Promise<TracedObject3D | null | { root: TracedObject3D }>) => {
            return new Promise((resolve, reject) => {
                resultPromise.then((result) => {
                    try {
                        if (result !== null) {
                            if (result instanceof Object3D) {
                                guardReclaimObject3DRecursively(controller, result as TracedObject3D);
                            } else {
                                guardReclaimObject3DRecursively(controller, (result as { root: TracedObject3D }).root);
                            }
                        }
                    } catch(err) {
                        console.error('[wle-trace] unhandled exception in reclaim logic of Scene.append after hook:', err);
                    }

                    resolve(result);
                }).catch(reject);
            });
        },
        safeHooks: false,
        afterHookReplacesReturn: true,
    });

    injectMethod(Scene.prototype, 'reset', {
        beforeHook: (scene: Scene, _methodName: string, _args: any[]) => {
            sceneDestroyCheck(controller, scene.engine);
        },
        afterHook: (scene: Scene, _methodName: string, _args: any[]) => {
            trackedDestroyMark(controller, scene.engine, 'Scene.load');
        },
        traceHook: controller.guardFunction('trace:Scene.reset', sceneMethodTracer),
    });
}