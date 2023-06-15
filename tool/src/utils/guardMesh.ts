import { trackedMeshes } from './trackedMeshes.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Mesh } from '@wonderlandengine/api';

controller.registerFeature('guard:Mesh');

// TODO originFactory could just be a StyledMessage instance instead of this.
//      the argument passed to the factory is also not used anywhere
export function guardMesh(mesh: Mesh, strict: boolean, originFactory: ((mesh: Mesh) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Mesh')) {
        return;
    }

    if (mesh._index < 0 || !trackedMeshes.get(mesh.engine, mesh._index)) {
        let message = StyledMessage.fromMesh(mesh);
        if (originFactory !== null) {
            message = originFactory(mesh).addSubMessage(message);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message
            .add('attempt to use invalid Mesh')
            .print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(true);
    }
}

export function strictGuardMesh(mesh: Mesh) {
    guardMesh(mesh, true);
}

export function softGuardMesh(mesh: Mesh) {
    guardMesh(mesh, false);
}