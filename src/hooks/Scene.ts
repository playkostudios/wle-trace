import { Object3D, Scene } from '@wonderlandengine/api';
import { injectMethod } from './inject.js';
import { guardReclaimObject3D, guardReclaimObject3DRecursively } from './guardReclaim.js';

injectMethod(Scene.prototype, 'addObject', null, null, (_obj, _methodName, _args, newObj) => {
    guardReclaimObject3D(newObj);
});

injectMethod(Scene.prototype, 'addObjects', null, null, (_obj, _methodName, _args, newObjs) => {
    for (const newObj of newObjs) {
        guardReclaimObject3D(newObj);
    }
});

injectMethod(Scene.prototype, 'append', null, null, (_obj, _methodName, _args, resultPromise) => {
    return new Promise((resolve, reject) => {
        resultPromise.then((result) => {
            try {
                if (result !== null) {
                    if (result instanceof Object3D) {
                        guardReclaimObject3DRecursively(result);
                    } else {
                        guardReclaimObject3DRecursively(result.root);
                    }
                }
            } catch(err) {
                console.error('[wle-trace] unhandled exception in reclaim logic of Scene.append after hook:', err);
            }

            resolve(result);
        }).catch(reject);
    })
}, null, true);
