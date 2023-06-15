import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { trackedTextures } from './trackedTextures.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { type TracedTexture } from '../types/TracedTexture.js';

controller.registerFeature('guard:Texture');

export function guardTexture(texture: TracedTexture, strict: boolean, originFactory: ((mesh: TracedTexture) => StyledMessage) | null = null) {
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

        message.add('attempt to use invalid Texture');

        addDestructionTrace(message, texture.__wle_trace_destruction_trace);

        message.print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(strict);
    } else if (texture.__wle_trace_destruction_trace) {
        let message = StyledMessage.fromTexture(texture);
        if (originFactory !== null) {
            message = originFactory(texture).addSubMessage(message);
        }

        message
            .add(' - unsafe Texture reuse detected; this Texture instance was previously destroyed but the ID is valid, so this might be a use-after-destroy')
            .print(true, WARN);

        triggerGuardBreakpoint(false);
    }
}

export function strictGuardTexture(texture: TracedTexture) {
    guardTexture(texture, true);
}

export function softGuardTexture(texture: TracedTexture) {
    guardTexture(texture, false);
}