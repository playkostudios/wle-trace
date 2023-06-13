import { trackedMeshes } from './trackedMeshes.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Mesh } from '@wonderlandengine/api';

controller.registerFeature('guard:Mesh');

export function guardMesh(mesh: Mesh) {
    if (!controller.isEnabled('guard:Mesh')) {
        return;
    }

    if (mesh._index < 0 || !trackedMeshes.get(mesh.engine, mesh._index)) {
        const message = StyledMessage.fromMesh(mesh);
        message.add(' - attempt to use invalid mesh', ERR);
        message.print(true, ERR);
        triggerGuardBreakpoint(true);
    }
}
