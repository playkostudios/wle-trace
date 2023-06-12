import { validMeshes } from '../hooks/Mesh.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Mesh } from '@wonderlandengine/api';

controller.registerFeature('guard:Mesh');

export function guardMesh(mesh: Mesh) {
    if (!controller.isEnabled('guard:Mesh')) {
        return;
    }

    if (mesh._index < 0 || validMeshes.has(mesh._index)) {
        const message = StyledMessage.fromValue(mesh);
        message.add(' - attempt to use invalid mesh', ERR);
        message.print(true, ERR);
        triggerGuardBreakpoint(true);
    }
}
