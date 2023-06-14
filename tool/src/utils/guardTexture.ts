import { ERR, StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Texture } from '@wonderlandengine/api';
import { trackedTextures } from './trackedTextures.js';

controller.registerFeature('guard:Texture');

export function guardTexture(texture: Texture) {
    if (!controller.isEnabled('guard:Texture')) {
        return;
    }

    if (!trackedTextures.get(texture.engine, texture.id)) {
        const message = StyledMessage.fromTexture(texture);
        message.add(' - attempt to use invalid texture', ERR);
        message.print(true, ERR);
        triggerGuardBreakpoint(true);
    }
}
