import { type WLETraceController } from '../WLETraceController.js';
import { type StyledMessage } from '../StyledMessage.js';

export function addDestructionTrace(controller: WLETraceController, message: StyledMessage, trace?: string | null) {
    if (!controller.isEnabled('destruction-traces')) {
        return;
    }

    if (trace) {
        message.add(`. Originally destroyed in following trace:\n${trace}`);
    } else {
        message.add('. Destruction trace not available; ');

        if (trace === null) {
            message.add('destruction-traces feature not enabled when destroy was called, or destruction condition was unexpected');
        } else {
            message.add('resource was destroyed in a different instance');
        }
    }
}