import { controller } from '../WLETraceController.js';
import { type StyledMessage } from '../StyledMessage.js';

export function addDestructionTrace(message: StyledMessage, trace: string | null) {
    if (!controller.isEnabled('destruction-traces')) {
        return;
    }

    if (trace) {
        message.add(`. Originally destroyed in following trace:\n${trace}`);
    } else {
        message.add('. Destruction trace not available; destruction-traces feature not enabled when destroy was called');
    }
}