import { controller } from './WLETraceController.js';
import { getStackTrace } from './getStackTrace.js';

controller.registerFeature('destruction-traces');

export function getDestructionTrace() {
    if (controller.isEnabled('destruction-traces')) {
        return getStackTrace();
    } else {
        return null;
    }
}