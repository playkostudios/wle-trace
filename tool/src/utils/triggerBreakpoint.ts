import { controller } from '../WLETraceController.js';

controller.registerFeature('breakpoint:guard-failed');
controller.registerFeature('breakpoint:destruction:Object3D');
controller.registerFeature('breakpoint:destruction:Component');
controller.registerFeature('breakpoint:construction:Object3D');
controller.registerFeature('breakpoint:construction:Component');

export function triggerBreakpoint(reason: string) {
    if (controller.isEnabled(`breakpoint:${reason}`)) {
        debugger;
    }
}