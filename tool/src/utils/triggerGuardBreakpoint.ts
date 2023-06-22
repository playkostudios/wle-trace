import { type WLETraceController } from '../WLETraceController.js';
import { triggerBreakpoint } from './triggerBreakpoint.js';

export function triggerGuardBreakpoint(controller: WLETraceController, isError: boolean) {
    if (isError || !controller.isEnabled('breakpoint:strict-guard-only')) {
        triggerBreakpoint(controller, 'guard-failed');
    }
}