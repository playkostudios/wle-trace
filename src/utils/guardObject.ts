import { type TracedObject3D } from '../types/TracedObject3D.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';

controller.registerFeature('guard:Object3D');

export function guardObject(obj: TracedObject3D, strict: boolean, originFactory: ((component: TracedObject3D) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Object3D')) {
        return;
    }

    if (obj._objectId === -1 || obj.__wle_trace_destroyed_data || obj.__wle_trace_destroying_data) {
        let path, destroyTrace;
        if (obj.__wle_trace_destroying_data) {
            strict = false;
            path = obj.__wle_trace_destroying_data[0];
            destroyTrace = obj.__wle_trace_destroying_data[3];
        } else if (obj.__wle_trace_destroyed_data) {
            [path, destroyTrace] = obj.__wle_trace_destroyed_data;
        } else {
            new StyledMessage()
                .add('use-after-destroy detected in unexpected destroyed object')
                .print(true, ERR);

            triggerGuardBreakpoint(strict);

            return;
        }

        if (obj._objectId !== -1) {
            new StyledMessage()
                .add('unexpected reclaim; was destroyed object ')
                .addSubMessage(path)
                .print(true, WARN);

            if (obj.__wle_trace_destroyed_data) {
                delete obj.__wle_trace_destroyed_data;
            }

            if (obj.__wle_trace_destroying_data) {
                delete obj.__wle_trace_destroying_data;
            }

            return;
        }

        let message;
        if (originFactory === null) {
            message = path.clone();
        } else {
            message = originFactory(obj).addSubMessage(path);
        }

        const style = strict ? ERR : WARN;

        message.add(' - ', style);

        if (!strict) {
            message.add('possible ', style);
        }

        message.add('use-after-destroy detected', style);

        if (obj.__wle_trace_destroying_data) {
            message.add('; accessed while Object3D is being destroyed', style);
        }

        addDestructionTrace(message, destroyTrace);

        message.print(true, style);

        triggerGuardBreakpoint(strict);
    }
}

export function strictGuardObject(obj: TracedObject3D) {
    guardObject(obj, true);
}

export function softGuardObject(obj: TracedObject3D) {
    guardObject(obj, false);
}