import { ERR, StyledMessage, WARN } from './StyledMessage.js';
import { controller } from './WLETraceController.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';

controller.registerFeature('guard:Object3D');

export function guardObject(obj, strict, originFactory = null) {
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
            message = new StyledMessage()
                .add('use-after-destroy detected in unexpected destroyed object');
            message.print(true, ERR);

            triggerGuardBreakpoint(strict);

            return;
        }

        let message;
        if (obj._objectId !== -1) {
            message = new StyledMessage()
                .add('unexpected reclaim; was destroyed object ')
                .addSubMessage(path);
            message.print(true, WARN);

            if (obj.__wle_trace_destroyed_data) {
                delete obj.__wle_trace_destroyed_data;
            }

            if (obj.__wle_trace_destroying_data) {
                delete obj.__wle_trace_destroying_data;
            }

            return;
        }

        if (originFactory === null) {
            message = path.clone();
        } else {
            message = originFactory(obj);
            message.addSubMessage(path);
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

export function strictGuardObject(obj) {
    guardObject(obj, true);
}

export function softGuardObject(obj) {
    guardObject(obj, false);
}