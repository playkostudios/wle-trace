import { controller } from './WLETraceController.js';
import { triggerBreakpoint } from './triggerBreakpoint.js';

controller.registerFeature('breakpoint:strict-guard-only');

export function triggerGuardBreakpoint(isError) {
    if (isError || !controller.isEnabled('breakpoint:strict-guard-only')) {
        triggerBreakpoint('guard-failed');
    }
}