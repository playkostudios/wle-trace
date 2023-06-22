import { ERR, StyledMessage } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';

export function componentDestroyCheck(controller: WLETraceController, comp: TracedComponent) {
    if (comp.__wle_trace_destroyed_data) {
        new StyledMessage(controller)
            .add('double-destroy detected in component ', ERR)
            .addSubMessage(comp.__wle_trace_destroyed_data[0])
            .print(true, ERR);

        triggerGuardBreakpoint(controller, true);
    } else if (comp.__wle_trace_destroying_data) {
        // do nothing
    } else if (comp._id === -1) {
        new StyledMessage(controller)
            .add('double-destroy detected in unexpected destroyed component')
            .print(true, ERR);

        triggerGuardBreakpoint(controller, true);
    } else {
        const path = StyledMessage.fromComponent(controller, comp);

        if (controller.isEnabled('trace:destruction:Component')) {
            const message = new StyledMessage(controller);
            message.add('destroying Component ');
            message.addSubMessage(path);
            message.add(` (ID ${comp._id})`);
            message.print(true);
        }

        triggerBreakpoint(controller, 'destruction:Component');

        comp.__wle_trace_destroying_data = [path, getDestructionTrace(controller)];
    }
}

export function componentDestroyMark(comp: TracedComponent) {
    // XXX only mark components as destroyed after calling destroy so that the
    //     tracer callback doesn't think the object is already destroyed, and so
    //     that we can get the component index as part of the trace
    if ('__wle_trace_destroying_data' in comp) {
        comp.__wle_trace_destroyed_data = comp.__wle_trace_destroying_data;
        delete comp.__wle_trace_destroying_data;
    }
}