import { origObjectGetter } from '../hooks/orig-properties.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { trackedComponents } from './trackedComponents.js';

export function guardComponent(controller: WLETraceController, component: TracedComponent, strict: boolean, originFactory: ((component: TracedComponent) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Component')) {
        return;
    }

    if (controller.isEnabled('debug:ghost:Component')) {
        if (!trackedComponents.has(component.engine, component)) {
            new StyledMessage(controller)
                .add(`ghost Component (ID ${component._id}) detected in guard`)
                .print(true, ERR);

            debugger;
            return;
        }
    }

    if (component.__wle_trace_destroyed_data) {
        let message;
        if (originFactory === null) {
            message = component.__wle_trace_destroyed_data[0].clone();
        } else {
            message = originFactory(component);
            message.addSubMessage(component.__wle_trace_destroyed_data[0]);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message.add('use-after-destroy detected');

        addDestructionTrace(controller, message, component.__wle_trace_destroyed_data[1]);

        const style = strict ? ERR : WARN;
        message.print(true, style);

        triggerGuardBreakpoint(controller, true);
    }

    const obj = origObjectGetter.apply(component);
    if (obj) {
        guardObject(controller, obj, strict);
    } else {
        const message = StyledMessage.fromComponent(controller, component);
        message.add(' - attempt to use detached component', ERR);
        message.print(true, ERR);
        triggerGuardBreakpoint(controller, true);
    }
}

export function strictGuardComponent(controller: WLETraceController, component: TracedComponent) {
    guardComponent(controller, component, true);
}

export function softGuardComponent(controller: WLETraceController, component: TracedComponent) {
    guardComponent(controller, component, false);
}