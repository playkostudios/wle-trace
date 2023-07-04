import { type WLETraceController } from '../WLETraceController.js';

export function triggerBreakpoint(controller: WLETraceController, reason: string) {
    if (controller.isEnabled(`breakpoint:${reason}`)) {
        debugger;
    }
}