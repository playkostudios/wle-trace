import { Mesh, type ComponentConstructor, type WonderlandEngine } from '@wonderlandengine/api';
import { STR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { origChildrenGetter, origGetComponentsMethod } from '../hooks/orig-properties.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { triggerBreakpoint } from './triggerBreakpoint.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { trackedMeshes } from './trackedMeshes.js';
import { trackedObject3Ds } from './trackedObject3Ds.js';
import { trackedComponents } from './trackedComponents.js';

controller.registerFeature('trace:reclaim:Object3D');
controller.registerFeature('trace:reclaim:Component');
controller.registerFeature('guard:bad-reclaim:Object3D');
controller.registerFeature('guard:bad-reclaim:Component');
controller.registerFeature('trace:construction:Object3D');
controller.registerFeature('construction:Object3D');
controller.registerFeature('trace:construction:Component');
controller.registerFeature('construction:Component');
controller.registerFeature('trace:construction:Mesh');
controller.registerFeature('construction:Mesh');

export function guardReclaimComponent(comp: TracedComponent) {
    trackedComponents.add(comp.engine, comp);
    let prevPath = null;
    // HACK there is a bug in wonderland engine which causes random crashes and
    //      bad component reclaim messages that are false-positives
    // TODO remove this once WLE team fixes the bug
    (comp as { _object: null })._object = null;

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

    if (controller.isEnabled('trace:construction:Component')) {
        new StyledMessage()
            .add('creating Component ')
            .addSubMessage(StyledMessage.fromComponent(comp))
            .add(` (ID ${comp._id})`)
            .print(true);
    }

    triggerBreakpoint('construction:Component');
}

export function guardReclaimObject3D(obj: TracedObject3D) {
    trackedObject3Ds.add(obj._engine, obj);

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

    if (controller.isEnabled('trace:construction:Object3D')) {
        new StyledMessage()
            .add('creating Object3D ')
            .addSubMessage(StyledMessage.fromObject3D(obj))
            .add(` (ID ${obj._objectId})`)
            .print(true);
    }

    triggerBreakpoint('construction:Object3D');
}

export function guardReclaimObject3DRecursively(obj: TracedObject3D) {
    guardReclaimObject3D(obj);

    for (const comp of origGetComponentsMethod.apply(obj)) {
        // XXX try to mark properties in loaded component as new if never seen
        //     before
        const ctor = comp.constructor as ComponentConstructor;
        for (const propertyName of Object.getOwnPropertyNames(ctor.Properties)) {
            const propertyValue = (comp as unknown as Record<string, unknown>)[propertyName];

            if (propertyValue !== undefined && propertyValue !== null && typeof propertyValue === 'object') {
                if (propertyValue instanceof Mesh) {
                    guardReclaimMesh(comp.engine, propertyValue);
                }
            }
        }

        guardReclaimComponent(comp);
    }

    for (const child of origChildrenGetter.apply(obj)) {
        guardReclaimObject3DRecursively(child);
    }
}

export function guardReclaimMesh(engine: WonderlandEngine, meshOrIdx: Mesh | number) {
    const meshIdx = (typeof meshOrIdx === 'number') ? meshOrIdx : meshOrIdx._index;

    const isValid = trackedMeshes.get(engine, meshIdx);
    if (isValid === undefined) {
        trackedMeshes.set(engine, meshIdx, true);
    } else if (!isValid) {
        // TODO proper error logging, and check if there is mesh reclaiming
        throw new Error('whoa!');
    }

    if (controller.isEnabled('trace:construction:Mesh')) {
        new StyledMessage()
            .add('creating Mesh ')
            .addSubMessage(StyledMessage.fromMesh(meshIdx))
            .print(true);
    }

    triggerBreakpoint('construction:Mesh');
}