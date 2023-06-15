import { Mesh } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { strictGuardMesh } from '../utils/guardMesh.js';
import { trackedMeshes } from '../utils/trackedMeshes.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { type TracedMesh } from '../types/TracedMesh.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { addDestructionTrace } from '../utils/addDestructionTrace.js';

controller.registerFeature('trace:destruction:Mesh');
controller.registerFeature('debug:ghost:Mesh');

// XXX can't override constructor as that will break instanceof statements.
//     however, we can override the internal WASM._wl_mesh_create method
//     instead. this is done in the WonderlandEngine hooks

injectMethod(Mesh.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Mesh.destroy', traceValueMethod),
    beforeHook: (mesh: TracedMesh, _methodName: string) => {
        const engine = mesh.engine;
        const meshIdx = mesh._index;
        const trackerStatus = trackedMeshes.get(engine, meshIdx);
        const meshMsg = StyledMessage.fromMesh(mesh);

        if (mesh.__wle_trace_destruction_trace !== undefined) {
            if (trackerStatus) {
                new StyledMessage()
                    .add('destroy detected in unsafely-reused Mesh ')
                    .addSubMessage(meshMsg)
                    .print(true, ERR);
            } else {
                const message = new StyledMessage()
                    .add('double-destroy detected in Mesh ')
                    .addSubMessage(meshMsg);

                addDestructionTrace(message, mesh.__wle_trace_destruction_trace);

                message.print(true, ERR);
            }
        } else {
            mesh.__wle_trace_destruction_trace = getDestructionTrace();

            if (trackerStatus === undefined) {
                new StyledMessage()
                    .add('destroy detected in untracked Mesh ')
                    .addSubMessage(meshMsg)
                    .print(true, ERR);

                triggerGuardBreakpoint(true);

                if (controller.isEnabled('debug:ghost:Mesh')) {
                    new StyledMessage()
                        .add(`ghost Mesh (ID ${meshIdx}) detected in guard`)
                        .print(true, ERR);

                    debugger;
                }
            } else if (trackerStatus) {
                trackedMeshes.set(engine, meshIdx, false);

                if (controller.isEnabled('trace:destruction:Mesh')) {
                    new StyledMessage()
                        .add('destroying Mesh ')
                        .addSubMessage(meshMsg)
                        .print(true);
                }

                triggerBreakpoint('destruction:Mesh');
            } else {
                const message = new StyledMessage()
                    .add('double-destroy detected in Mesh ')
                    .addSubMessage(meshMsg);

                addDestructionTrace(message, undefined);

                message.print(true, ERR);

                triggerGuardBreakpoint(true);
            }
        }
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