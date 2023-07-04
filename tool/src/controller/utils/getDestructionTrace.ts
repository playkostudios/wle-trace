import { type WLETraceController } from '../WLETraceController.js';
import { getStackTrace } from './getStackTrace.js';

export function getDestructionTrace(controller: WLETraceController) {
    if (controller.isEnabled('destruction-traces')) {
        return getStackTrace();
    } else {
        return null;
    }
}