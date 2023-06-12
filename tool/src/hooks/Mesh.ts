import { Mesh } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { guardMesh } from '../utils/guardMesh.js';

controller.registerFeature('trace:destruction:Mesh');
controller.registerFeature('destruction:Mesh');

export const validMeshes = new Set();

// TODO override constructor to create new mesh
// TODO handle auto-created meshes from scene.append

injectMethod(Mesh.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Mesh.destroy', traceValueMethod),
    beforeHook: (mesh: Mesh, _methodName: string) => {
        validMeshes.delete(mesh._index);
    }
});

// auto-inject trivial Mesh properties
const PROPERTY_DENY_LIST = new Set([ 'constructor', 'destroy', 'engine' ]);

for (const name of Object.getOwnPropertyNames(Mesh.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(Mesh.prototype, name);
    if (descriptor.get || descriptor.set) {
        let getterOptions = null;
        if (descriptor.get) {
            getterOptions = {
                traceHook: controller.guardFunction(`trace:get:Mesh.${name}`, traceValueProperty),
                beforeHook: guardMesh,
            };
        }

        let setterOptions = null;
        if (descriptor.set) {
            setterOptions = {
                traceHook: controller.guardFunction(`trace:set:Mesh.${name}`, traceValueSet),
                beforeHook: guardMesh,
            };
        }

        injectAccessor(Mesh.prototype, name, getterOptions, setterOptions);
    } else {
        injectMethod(Mesh.prototype, name, {
            traceHook: controller.guardFunction(`trace:Mesh.${name}`, traceValueMethod),
            beforeHook: guardMesh,
        });
    }
}