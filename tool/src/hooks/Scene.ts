import { Object3D, Scene } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimObject3D, guardReclaimObject3DRecursively } from '../utils/guardReclaim.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';
import { controller } from '../WLETraceController.js';

injectMethod(Scene.prototype, 'addObject', {
    traceHook: controller.guardFunction('trace:Scene.addObject', makeGlobalObjMethodTracer('Scene')),
    afterHook: (_scene: Scene, _methodName: string, _args: any[], newObj: TracedObject3D) => {
        guardReclaimObject3D(newObj);
    }
});

injectMethod(Scene.prototype, 'addObjects', {
    traceHook: controller.guardFunction('trace:Scene.addObjects', makeGlobalObjMethodTracer('Scene')),
    afterHook: (_scene: Scene, _methodName: string, _args: any[], newObjs: TracedObject3D[]) => {
        for (const newObj of newObjs) {
            guardReclaimObject3D(newObj);
        }
    }
});

injectMethod(Scene.prototype, 'load', {
    traceHook: controller.guardFunction('trace:Scene.load', makeGlobalObjMethodTracer('Scene')),
});

injectMethod(Scene.prototype, 'append', {
    traceHook: controller.guardFunction('trace:Scene.append', makeGlobalObjMethodTracer('Scene')),
    afterHook: (_scene: Scene, _methodName: string, _args: any[], resultPromise: Promise<TracedObject3D | null | { root: TracedObject3D }>) => {
        return new Promise((resolve, reject) => {
            resultPromise.then((result) => {
                try {
                    if (result !== null) {
                        if (result instanceof Object3D) {
                            guardReclaimObject3DRecursively(result as TracedObject3D);
                        } else {
                            guardReclaimObject3DRecursively((result as { root: TracedObject3D }).root);
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