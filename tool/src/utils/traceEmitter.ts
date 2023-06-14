import { STR, StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';

export function traceEmitter(emitterID: string) {
    if (controller.isEnabled(`trace:emitter:${emitterID}`)) {
        new StyledMessage()
            .add('emitter ').add(emitterID, STR).add(' sent a notification')
            .print(false);
    }
}