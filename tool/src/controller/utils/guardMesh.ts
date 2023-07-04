import { trackedMeshes } from './trackedMeshes.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type TracedMesh } from '../types/TracedMesh.js';
import { addDestructionTrace } from './addDestructionTrace.js';

// TODO originFactory could just be a StyledMessage instance instead of this.
//      the argument passed to the factory is also not used anywhere
export function guardMesh(controller: WLETraceController, mesh: TracedMesh, strict: boolean, originFactory: ((mesh: TracedMesh) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Mesh')) {
        return;
    }

    if (mesh._index < 0 || !trackedMeshes.get(mesh.engine, mesh._index)) {
        let message = StyledMessage.fromMesh(controller, mesh);
        if (originFactory !== null) {
            message = originFactory(mesh).addSubMessage(message);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message.add('attempt to use invalid Mesh');

        addDestructionTrace(controller, message, mesh.__wle_trace_destruction_trace);

        message.print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(controller, strict);
    } else if (mesh.__wle_trace_destruction_trace) {
        let message = StyledMessage.fromMesh(controller, mesh);
        if (originFactory !== null) {
            message = originFactory(mesh).addSubMessage(message);
        }

        message
            .add(' - unsafe Mesh reuse detected; this Mesh instance was previously destroyed but the ID is valid, so this might be a use-after-destroy')
            .print(true, WARN);

        triggerGuardBreakpoint(controller, false);
    }
}

export function strictGuardMesh(controller: WLETraceController, mesh: TracedMesh) {
    guardMesh(controller, mesh, true);
}

export function softGuardMesh(controller: WLETraceController, mesh: TracedMesh) {
    guardMesh(controller, mesh, false);
}