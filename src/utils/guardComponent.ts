import { origObjectGetter } from './orig-properties.js';
import { ERR, StyledMessage } from './StyledMessage.js';
import { controller } from './WLETraceController.js';
import { guardObject } from './guardObject.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { addDestructionTrace } from './addDestructionTrace.js';

controller.registerFeature('guard:Component');

export function guardComponent(component, strict, originFactory = null) {
    if (!controller.isEnabled('guard:Component')) {
        return;
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

        addDestructionTrace(message, component.__wle_trace_destroyed_data[1]);

        message.print(true, style);

        triggerGuardBreakpoint(strict ? ERR : WARN);
    }

    const obj = origObjectGetter.apply(component);
    if (obj) {
        guardObject(obj, strict);
    } else {
        const message = StyledMessage.fromComponent(component);
        message.add(' - attempt to use detached component', ERR);
        message.print(true, ERR);
        triggerGuardBreakpoint(true);
    }
}

export function strictGuardComponent(component) {
    guardComponent(component, true);
}

export function softGuardComponent(component) {
    guardComponent(component, false);
}