import { Mesh } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';
import { injectAccessor } from '../../common/inject/injectAccessor.js';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { strictGuardMesh } from '../utils/guardMesh.js';
import { trackedMeshes } from '../utils/trackedMeshes.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { type TracedMesh } from '../types/TracedMesh.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { addDestructionTrace } from '../utils/addDestructionTrace.js';

export function injectMesh(controller: WLETraceController) {
    const boundStrictGuardMesh = controller.bindFunc(strictGuardMesh);
    const boundTraceValueProperty = controller.bindFunc(traceValueProperty);
    const boundTraceValueSet = controller.bindFunc(traceValueSet);
    const boundTraceValueMethod = controller.bindFunc(traceValueMethod);

    controller.registerFeature('trace:destruction:Mesh');
    controller.registerFeature('debug:ghost:Mesh');

    // XXX can't override constructor as that will break instanceof statements.
    //     however, we can override the internal WASM._wl_mesh_create method
    //     instead. this is done in the WonderlandEngine hooks

    injectMethod(Mesh.prototype, 'destroy', {
        traceHook: controller.guardFunction('trace:Mesh.destroy', boundTraceValueMethod),
        beforeHook: (mesh: TracedMesh, _methodName: string) => {
            const engine = mesh.engine;
            const meshIdx = mesh._index;
            const trackerStatus = trackedMeshes.get(engine, meshIdx);
            const meshMsg = StyledMessage.fromMesh(controller, mesh);

            if (mesh.__wle_trace_destruction_trace !== undefined) {
                if (trackerStatus) {
                    new StyledMessage(controller)
                        .add('destroy detected in unsafely-reused Mesh ')
                        .addSubMessage(meshMsg)
                        .print(true, ERR);
                } else {
                    const message = new StyledMessage(controller)
                        .add('double-destroy detected in Mesh ')
                        .addSubMessage(meshMsg);

                    addDestructionTrace(controller, message, mesh.__wle_trace_destruction_trace);

                    message.print(true, ERR);
                }
            } else {
                mesh.__wle_trace_destruction_trace = getDestructionTrace(controller);

                if (trackerStatus === undefined) {
                    new StyledMessage(controller)
                        .add('destroy detected in untracked Mesh ')
                        .addSubMessage(meshMsg)
                        .print(true, ERR);

                    triggerGuardBreakpoint(controller, true);

                    if (controller.isEnabled('debug:ghost:Mesh')) {
                        new StyledMessage(controller)
                            .add(`ghost Mesh (ID ${meshIdx}) detected in guard`)
                            .print(true, ERR);

                        debugger;
                    }
                } else if (trackerStatus) {
                    trackedMeshes.set(engine, meshIdx, false);

                    if (controller.isEnabled('trace:destruction:Mesh')) {
                        new StyledMessage(controller)
                            .add('destroying Mesh ')
                            .addSubMessage(meshMsg)
                            .print(true);
                    }

                    triggerBreakpoint(controller, 'destruction:Mesh');
                } else {
                    const message = new StyledMessage(controller)
                        .add('double-destroy detected in Mesh ')
                        .addSubMessage(meshMsg);

                    addDestructionTrace(controller, message, undefined);

                    message.print(true, ERR);

                    triggerGuardBreakpoint(controller, true);
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
                    traceHook: controller.guardFunction(`trace:get:Mesh.${name}`, boundTraceValueProperty),
                    beforeHook: boundStrictGuardMesh,
                };
            }

            let setterOptions = null;
            if (descriptor.set) {
                setterOptions = {
                    traceHook: controller.guardFunction(`trace:set:Mesh.${name}`, boundTraceValueSet),
                    beforeHook: boundStrictGuardMesh,
                };
            }

            injectAccessor(Mesh.prototype, name, getterOptions, setterOptions);
        } else {
            injectMethod(Mesh.prototype, name, {
                traceHook: controller.guardFunction(`trace:Mesh.${name}`, boundTraceValueMethod),
                beforeHook: boundStrictGuardMesh,
            });
        }
    }
}