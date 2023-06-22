import { type TracedObject3D } from '../types/TracedObject3D.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { addDestructionTrace } from './addDestructionTrace.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { trackedObject3Ds } from './trackedObject3Ds.js';

export function guardObject(controller: WLETraceController, obj: TracedObject3D, strict: boolean, originFactory: ((component: TracedObject3D) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Object3D')) {
        return;
    }

    if (controller.isEnabled('debug:ghost:Object3D')) {
        if (!trackedObject3Ds.has(obj._engine, obj)) {
            new StyledMessage(controller)
                .add(`ghost Object3D (ID ${obj._objectId}) detected in guard`)
                .print(true, ERR);

            debugger;
            return;
        }
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
            new StyledMessage(controller)
                .add('use-after-destroy detected in unexpected destroyed object')
                .print(true, ERR);

            triggerGuardBreakpoint(controller, strict);

            return;
        }

        // XXX Scene.load and Scene.reset will NOT result in Object3D.destroy
        //     being called, so we can't rely on _objectId being -1 to detect an
        //     unexpected destroy
        // if (obj._objectId !== -1) {
        //     new StyledMessage()
        //         .add('unexpected reclaim; was destroyed object ')
        //         .addSubMessage(path)
        //         .print(true, WARN);

        //     if (obj.__wle_trace_destroyed_data) {
        //         delete obj.__wle_trace_destroyed_data;
        //     }

        //     if (obj.__wle_trace_destroying_data) {
        //         delete obj.__wle_trace_destroying_data;
        //     }

        //     return;
        // }

        let message;
        if (originFactory === null) {
            message = path.clone();
        } else {
            message = originFactory(obj).addSubMessage(path);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message.add('use-after-destroy detected');

        if (obj.__wle_trace_destroying_data) {
            message.add('; accessed while Object3D is being destroyed');
        }

        addDestructionTrace(controller, message, destroyTrace);

        message.print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(controller, strict);
    }
}

export function strictGuardObject(controller: WLETraceController, obj: TracedObject3D) {
    guardObject(controller, obj, true);
}

export function softGuardObject(controller: WLETraceController, obj: TracedObject3D) {
    guardObject(controller, obj, false);
}