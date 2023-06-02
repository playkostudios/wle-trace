import { STR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { origChildrenGetter, origGetComponentsMethod } from '../hooks/orig-properties.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';

controller.registerFeature('trace:reclaim:Object3D');
controller.registerFeature('trace:reclaim:Component');
controller.registerFeature('guard:bad-reclaim:Object3D');
controller.registerFeature('guard:bad-reclaim:Component');

export function guardReclaimComponent(comp: TracedComponent) {
    let prevPath = null;

    if (comp.__wle_trace_destroyed_data) {
        prevPath = comp.__wle_trace_destroyed_data[0];
        delete comp.__wle_trace_destroyed_data;
    } else if (comp.__wle_trace_destroying_data) {
        prevPath = comp.__wle_trace_destroying_data[0];

        const message = new StyledMessage();
        message.add('Component at path ', WARN);
        message.addSubMessage(prevPath);
        message.add(` (ID ${comp._id})  was reclaimed while it was being destroyed`);
        message.print(true, WARN);

        delete comp.__wle_trace_destroying_data;
    }

    if (prevPath) {
        if (controller.isEnabled('trace:reclaim:Component')) {
            const message = StyledMessage.fromComponent(comp);
            message.add(` (ID ${comp._id}) was reclaimed from a previously destroyed component at `);
            message.addSubMessage(prevPath);
            message.print(true);
        }

        if (controller.isEnabled('guard:bad-reclaim:Component')) {
            const nativeProperties = [
                '_manager', '_id', '_object', '_engine'
            ];

            const unexpectedProperties = [];
            for (const name of Object.getOwnPropertyNames(comp)) {
                if (nativeProperties.indexOf(name) === -1) {
                    unexpectedProperties.push(name);
                }
            }

            if (unexpectedProperties.length > 0) {
                const message = StyledMessage.fromComponent(comp);
                message.add(` (ID ${comp._id}) was badly reclaimed from a previously destroyed component at `);
                message.addSubMessage(prevPath);
                message.add(`; the following old ${unexpectedProperties.length > 1 ? 'properties were' : 'property was'} still present: `);

                let notFirst = false;
                for (const unexpectedProperty of unexpectedProperties) {
                    if (notFirst) {
                        message.add(', ');
                    }

                    notFirst = true;
                    message.add(unexpectedProperty, STR);
                }

                message.print(true, WARN);

                triggerGuardBreakpoint(false);
            }
        }
    }
}

export function guardReclaimObject3D(obj: TracedObject3D) {
    let prevPath = null;

    if (obj.__wle_trace_destroyed_data) {
        prevPath = obj.__wle_trace_destroyed_data[0];
        delete obj.__wle_trace_destroyed_data;
    } else if (obj.__wle_trace_destroying_data) {
        prevPath = obj.__wle_trace_destroying_data[0];

        new StyledMessage()
            .add('Object3D at path ', WARN)
            .addSubMessage(prevPath)
            .add(` (ID ${obj._objectId}) was reclaimed while it was being destroyed`)
            .print(true, WARN);

        delete obj.__wle_trace_destroying_data;
    }

    if (prevPath) {
        if (controller.isEnabled('trace:reclaim:Object3D')) {
            StyledMessage.fromObject3D(obj)
                .add(` (ID ${obj._objectId}) was reclaimed from a previously destroyed object at `)
                .addSubMessage(prevPath)
                .print(true);
        }

        if (controller.isEnabled('guard:bad-reclaim:Object3D')) {
            const nativeProperties = [
                '_engine', '_objectId'
            ];

            const unexpectedProperties = [];
            for (const name of Object.getOwnPropertyNames(obj)) {
                if (nativeProperties.indexOf(name) === -1) {
                    unexpectedProperties.push(name);
                }
            }

            if (unexpectedProperties.length > 0) {
                const message = StyledMessage.fromObject3D(obj)
                    .add(` (ID ${obj._objectId}) was badly reclaimed from a previously destroyed object at `)
                    .addSubMessage(prevPath)
                    .add(`; the following old ${unexpectedProperties.length > 1 ? 'properties were' : 'property was'} still present: `);

                let notFirst = false;
                for (const unexpectedProperty of unexpectedProperties) {
                    if (notFirst) {
                        message.add(', ');
                    }

                    notFirst = true;
                    message.add(unexpectedProperty, STR);
                }

                message.print(true, WARN);

                triggerGuardBreakpoint(false);
            }
        }
    }
}

export function guardReclaimObject3DRecursively(obj: TracedObject3D) {
    guardReclaimObject3D(obj);

    for (const comp of origGetComponentsMethod.apply(obj)) {
        guardReclaimComponent(comp);
    }

    for (const child of origChildrenGetter.apply(obj)) {
        guardReclaimObject3DRecursively(child);
    }
}