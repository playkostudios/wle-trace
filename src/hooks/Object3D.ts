import { Object3D } from '@wonderlandengine/api';
import { injectAccessor, injectMethod } from './inject.js';
import { traceObjectMethod, traceObjectProperty, traceObjectSet } from './trace.js';
import { ERR, StyledMessage } from './StyledMessage.js';
import { strictGuardObject } from './guardObject.js';
import { guardObjectMethod } from './guardMethod.js';
import { guardObjectSetter } from './guardSetter.js';
import { origChildrenGetter } from './orig-properties.js';
import { origGetComponentsMethod } from './orig-properties.js';
import { controller } from './WLETraceController.js';
import { triggerBreakpoint } from './triggerBreakpoint.js';
import { guardReclaimComponent } from './guardReclaim.js';
import { getDestructionTrace } from './getDestructionTrace.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { componentDestroyCheck, componentDestroyMark } from './Component.js';

controller.registerFeature('trace:destruction:Object3D');
controller.registerFeature('destruction:Object3D');

// XXX object destruction order is from parent to child as of 1.0.2

function deepDestroyCheck(object) {
    if ('__wle_trace_destroyed_data' in object) {
        const message = new StyledMessage();
        message.add('double-destroy detected in object ', ERR);
        message.addSubMessage(object.__wle_trace_destroyed_data[0]);
        message.print(true, ERR);

        triggerGuardBreakpoint(true);
    } else if ('__wle_trace_destroying_data' in object) {
        // XXX should this be an error? it might be valid to destroy in a
        //     destroy handler - need testing. if it's valid, do nothing in this
        //     case (or warn?)
        const message = new StyledMessage();
        message.add('destroy detected in destroy handler of a component in the same object or child ', ERR);
        message.addSubMessage(object.__wle_trace_destroying_data[0]);
        message.print(true, ERR);

        triggerGuardBreakpoint(true);
    } else if (object._objectId === -1) {
        message = new StyledMessage()
            .add('double-destroy detected in unexpected destroyed object');
        message.print(true, ERR);

        triggerGuardBreakpoint(true);
    } else {
        const path = StyledMessage.fromObject3D(object);

        if (controller.isEnabled('trace:destruction:Object3D')) {
            const message = new StyledMessage();
            message.add('destroying Object3D ');
            message.addSubMessage(path);
            message.add(` (ID ${object._objectId})`);
            message.print(true);
        }

        triggerBreakpoint('destruction:Object3D');

        const children = origChildrenGetter.apply(object);
        const components = origGetComponentsMethod.apply(object);
        object.__wle_trace_destroying_data = [path, children, components, getDestructionTrace()];

        for (const comp of components) {
            componentDestroyCheck(comp);
        }

        for (const child of children) {
            deepDestroyCheck(child);
        }
    }
}

function deepDestroyMark(object) {
    // XXX only mark object as destroyed after calling destroy so that the
    //     tracer callback doesn't think the object is already destroyed
    if ('__wle_trace_destroying_data' in object) {
        const [path, children, components, destroyTrace] = object.__wle_trace_destroying_data;

        if (!('__wle_trace_destroyed_data' in object)) {
            object.__wle_trace_destroyed_data = [path, destroyTrace];
        }

        for (const comp of components) {
            componentDestroyMark(comp);
        }

        for (const child of children) {
            deepDestroyMark(child);
        }

        delete object.__wle_trace_destroying_data;
    }
}

// track destroyed objects
injectMethod(Object3D.prototype, 'destroy', traceObjectMethod, (object, _methodName) => {
    deepDestroyCheck(object);
}, (object, _methodName) => {
    deepDestroyMark(object);
}, 'trace:Object3D.destroy');

// guard against reclaim bugs on reclaimed components
injectMethod(Object3D.prototype, 'addComponent', traceObjectMethod, guardObjectAndMethod, (_obj, _methodName, _args, newComp) => {
    if (newComp) {
        guardReclaimComponent(newComp);
    }
}, 'trace:Object3D.addComponent');

// auto-inject trivial Object3D properties
// HACK objectId is not handled because it's used internally in the WLE API
const PROPERTY_DENY_LIST = new Set([ 'constructor', 'destroy', 'addComponent', 'objectId' ]);

function guardObjectAndMethod(obj, methodName, args) {
    strictGuardObject(obj);
    guardObjectMethod(obj, methodName, args, true);
}

function guardObjectAndSetter(obj, setterName, value) {
    strictGuardObject(obj);
    guardObjectSetter(obj, setterName, value, true);
}

for (const name of Object.getOwnPropertyNames(Object3D.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(Object3D.prototype, name);
    if (descriptor.get || descriptor.set) {
        injectAccessor(Object3D.prototype, name, traceObjectProperty, traceObjectSet, strictGuardObject, guardObjectAndSetter, `trace:get:Object3D.${name}`, `trace:set:Object3D.${name}`);
    } else {
        injectMethod(Object3D.prototype, name, traceObjectMethod, guardObjectAndMethod, null, `trace:Object3D.${name}`);
    }
}