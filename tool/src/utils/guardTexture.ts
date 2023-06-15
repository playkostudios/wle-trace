import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Texture } from '@wonderlandengine/api';
import { trackedTextures } from './trackedTextures.js';

controller.registerFeature('guard:Texture');

export function guardTexture(texture: Texture, strict: boolean, originFactory: ((mesh: Texture) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Texture')) {
        return;
    }

    if (!trackedTextures.get(texture.engine, texture.id)) {
        let message = StyledMessage.fromTexture(texture);
        if (originFactory !== null) {
            message = originFactory(texture).addSubMessage(message);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message
            .add('attempt to use invalid Texture')
            .print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(true);
    }
}

export function strictGuardTexture(texture: Texture) {
    guardTexture(texture, true);
}

export function softGuardTexture(texture: Texture) {
    guardTexture(texture, false);
}