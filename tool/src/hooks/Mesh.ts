import { Mesh } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { strictGuardMesh } from '../utils/guardMesh.js';
import { trackedMeshes } from '../utils/trackedMeshes.js';

controller.registerFeature('trace:destruction:Mesh');
controller.registerFeature('destruction:Mesh');

// XXX can't override constructor as that will break instanceof statements.
//     however, we can override the internal WASM._wl_mesh_create method
//     instead. this is done in the WonderlandEngine hooks

injectMethod(Mesh.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Mesh.destroy', traceValueMethod),
    beforeHook: (mesh: Mesh, _methodName: string) => {
        trackedMeshes.set(mesh.engine, mesh._index, false);
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
                beforeHook: strictGuardMesh,
            };
        }

        let setterOptions = null;
        if (descriptor.set) {
            setterOptions = {
                traceHook: controller.guardFunction(`trace:set:Mesh.${name}`, traceValueSet),
                beforeHook: strictGuardMesh,
            };
        }

        injectAccessor(Mesh.prototype, name, getterOptions, setterOptions);
    } else {
        injectMethod(Mesh.prototype, name, {
            traceHook: controller.guardFunction(`trace:Mesh.${name}`, traceValueMethod),
            beforeHook: strictGuardMesh,
        });
    }
}