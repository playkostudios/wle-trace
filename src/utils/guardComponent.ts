import { origObjectGetter } from '../hooks/orig-properties.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { type TracedComponent } from '../types/TracedComponent.js';

controller.registerFeature('guard:Component');

export function guardComponent(component: TracedComponent, strict: boolean, originFactory: ((component: TracedComponent) => StyledMessage) | null = null) {
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

        const style = strict ? ERR : WARN;
        message.print(true, style);

        triggerGuardBreakpoint(true);
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

export function strictGuardComponent(component: TracedComponent) {
    guardComponent(component, true);
}

export function softGuardComponent(component: TracedComponent) {
    guardComponent(component, false);
}