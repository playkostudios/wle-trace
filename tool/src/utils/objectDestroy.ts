import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';
import { componentDestroyCheck, componentDestroyMark } from './componentDestroy.js';
import { Object3DDestroyingData, type TracedObject3D } from '../types/TracedObject3D.js';
import { origChildrenGetter, origGetComponentsMethod } from '../hooks/orig-properties.js';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { trackedObject3Ds } from './trackedObject3Ds.js';
import { trackedComponents } from './trackedComponents.js';
import { type WonderlandEngine } from '@wonderlandengine/api';

controller.registerFeature('trace:destruction:Object3D');

// XXX object destruction order is from parent to child as of 1.0.2

export function deepDestroyCheck(object: TracedObject3D) {
    if (object.__wle_trace_destroyed_data) {
        new StyledMessage()
            .add('double-destroy detected in object ', ERR)
            .addSubMessage(object.__wle_trace_destroyed_data[0])
            .print(true, ERR);

        triggerGuardBreakpoint(true);
    } else if (object.__wle_trace_destroying_data) {
        // XXX should this be an error? it might be valid to destroy in a
        //     destroy handler - need testing. if it's valid, do nothing in this
        //     case (or warn?)
        new StyledMessage()
            .add('destroy detected in destroy handler of a component in the same object or child ', ERR)
            .addSubMessage(object.__wle_trace_destroying_data[0])
            .print(true, ERR);

        triggerGuardBreakpoint(true);
    } else if (object._objectId === -1) {
        new StyledMessage()
            .add('double-destroy detected in unexpected destroyed object')
            .print(true, ERR);

        triggerGuardBreakpoint(true);
    } else {
        const path = StyledMessage.fromObject3D(object);

        if (controller.isEnabled('trace:destruction:Object3D')) {
            new StyledMessage()
                .add('destroying Object3D ')
                .addSubMessage(path)
                .add(` (ID ${object._objectId})`)
                .print(true);
        }

        triggerBreakpoint('destruction:Object3D');

        const children = origChildrenGetter.apply(object);
        const components = origGetComponentsMethod.apply(object);

        for (const comp of components) {
            componentDestroyCheck(comp);
        }

        for (const child of children) {
            deepDestroyCheck(child);
        }

        object.__wle_trace_destroying_data = [path, children, components, getDestructionTrace()];
    }
}

export function shallowDestroyMark(object: TracedObject3D): Object3DDestroyingData | null {
    if (!object.__wle_trace_destroying_data) {
        return null;
    }

    const destroyingData = object.__wle_trace_destroying_data;
    delete object.__wle_trace_destroying_data;

    if (!object.__wle_trace_destroyed_data) {
        object.__wle_trace_destroyed_data = [destroyingData[0], destroyingData[3]];
    }

    return destroyingData;
}

export function deepDestroyMark(object: TracedObject3D) {
    // XXX only mark object as destroyed after calling destroy so that the
    //     tracer callback doesn't think the object is already destroyed
    const destroyingData = shallowDestroyMark(object);

    if (destroyingData) {
        for (const comp of destroyingData[2]) {
            componentDestroyMark(comp);
        }

        for (const child of destroyingData[1]) {
            deepDestroyMark(child);
        }
    }
}

export function sceneDestroyMark(engine: WonderlandEngine) {
    // mark everything in scene as being destroyed
    const sceneRoot = engine.wrapObject(0);
    const children = origChildrenGetter.apply(sceneRoot);
    const components = origGetComponentsMethod.apply(sceneRoot);

    for (const comp of components) {
        componentDestroyCheck(comp);
    }

    for (const child of children) {
        deepDestroyCheck(child);
    }
}

export function trackedDestroyMark(engine: WonderlandEngine, origin: string) {
    // HACK we can't use *DestroyMark on everything, because there could be new
    //      objects, and the hierarchy of the scene is now nuked so we also
    //      can't use deep marking
    for (const comp of trackedComponents.getAll(engine)) {
        if (comp.__wle_trace_destroying_data) {
            componentDestroyMark(comp);
        } else if (!comp.__wle_trace_destroyed_data) {
            comp.__wle_trace_destroyed_data = [new StyledMessage().add(`<unavailable Component; unexpectedly destroyed by ${origin}>`, WARN), null];
        }
    }

    for (const obj of trackedObject3Ds.getAll(engine)) {
        if (obj.__wle_trace_destroying_data) {
            shallowDestroyMark(obj);
        } else if (!obj.__wle_trace_destroyed_data) {
            obj.__wle_trace_destroyed_data = [new StyledMessage().add(`<unavailable Object3D; unexpectedly destroyed by ${origin}>`, WARN), null];
        }
    }
}