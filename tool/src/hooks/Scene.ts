import { type InstantiateResult, Prefab, Scene } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { guardReclaimObject3D, guardReclaimObject3DRecursively } from '../utils/guardReclaim.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';
import { controller } from '../WLETraceController.js';
import { sceneDestroyCheck, trackedDestroyMark } from '../utils/objectDestroy.js';

const sceneMethodTracer = makeGlobalObjMethodTracer('Prefab');

// TODO move these (prefab.prototype)
injectMethod(Prefab.prototype, 'addObject', {
    traceHook: controller.guardFunction('trace:Prefab.addObject', sceneMethodTracer),
    afterHook: (_prefab: Prefab, _methodName: string, _args: any[], newObj: TracedObject3D) => {
        guardReclaimObject3D(newObj);
    }
});

injectMethod(Prefab.prototype, 'addObjects', {
    traceHook: controller.guardFunction('trace:Prefab.addObjects', sceneMethodTracer),
    afterHook: (_prefab: Prefab, _methodName: string, _args: any[], newObjs: TracedObject3D[]) => {
        for (const newObj of newObjs) {
            guardReclaimObject3D(newObj);
        }
    }
});

injectMethod(Prefab.prototype, '_initialize', {
    traceHook: controller.guardFunction('trace:Prefab._initialize', sceneMethodTracer),
    afterHook: (prefab: Prefab, _methodName: string, _args: any[]) => {
        for (const child of prefab.getChildren()) {
            guardReclaimObject3DRecursively(child as unknown as TracedObject3D);
        }
    },
});

injectMethod(Scene.prototype, 'instantiate', {
    traceHook: controller.guardFunction('trace:Scene.instantiate', sceneMethodTracer),
    afterHook: (_scene: Scene, _methodName: string, _args: any[], result: InstantiateResult) => {
        guardReclaimObject3DRecursively(result.root as unknown as TracedObject3D);
    },
});

injectMethod(Scene.prototype, 'destroy', {
    beforeHook: (scene: Scene, _methodName: string, _args: any[]) => {
        sceneDestroyCheck(scene.engine);
    },
    afterHook: (scene: Scene, _methodName: string, _args: any[]) => {
        trackedDestroyMark(scene.engine, 'Scene.destroy');
    },
    traceHook: controller.guardFunction('trace:Scene.destroy', sceneMethodTracer),
});
