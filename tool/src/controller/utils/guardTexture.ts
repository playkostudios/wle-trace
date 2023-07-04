import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { trackedTextures } from './trackedTextures.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { type TracedTexture } from '../types/TracedTexture.js';

export function guardTexture(controller: WLETraceController, texture: TracedTexture, strict: boolean, originFactory: ((mesh: TracedTexture) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Texture')) {
        return;
    }

    if (!trackedTextures.get(texture.engine, texture.id)) {
        let message = StyledMessage.fromTexture(controller, texture);
        if (originFactory !== null) {
            message = originFactory(texture).addSubMessage(message);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message.add('attempt to use invalid Texture');

        addDestructionTrace(controller, message, texture.__wle_trace_destruction_trace);

        message.print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(controller, strict);
    } else if (texture.__wle_trace_destruction_trace) {
        let message = StyledMessage.fromTexture(controller, texture);
        if (originFactory !== null) {
            message = originFactory(texture).addSubMessage(message);
        }

        message
            .add(' - unsafe Texture reuse detected; this Texture instance was previously destroyed but the ID is valid, so this might be a use-after-destroy')
            .print(true, WARN);

        triggerGuardBreakpoint(controller, false);
    }
}

export function strictGuardTexture(controller: WLETraceController, texture: TracedTexture) {
    guardTexture(controller, texture, true);
}

export function softGuardTexture(controller: WLETraceController, texture: TracedTexture) {
    guardTexture(controller, texture, false);
}