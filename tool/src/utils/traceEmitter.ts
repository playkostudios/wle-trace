import { STR, StyledMessage } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';

export function traceEmitter(controller: WLETraceController, emitterID: string) {
    if (controller.isEnabled(`trace:emitter:${emitterID}`)) {
        new StyledMessage(controller)
            .add('emitter ').add(emitterID, STR).add(' sent a notification')
            .print(false);
    }
}