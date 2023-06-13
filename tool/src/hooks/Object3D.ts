import { Object3D } from '@wonderlandengine/api';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { guardObjectMethod } from '../utils/guardMethod.js';
import { strictGuardObject } from '../utils/guardObject.js';
import { guardReclaimComponent } from '../utils/guardReclaim.js';
import { guardObjectSetter } from '../utils/guardSetter.js';
import { traceObjectMethod, traceObjectProperty, traceObjectSet } from '../utils/trace.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';
import { componentDestroyCheck, componentDestroyMark } from './Component.js';
import { origChildrenGetter, origGetComponentsMethod } from './orig-properties.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { inAddComponent } from '../utils/inAddComponent.js';

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

export function deepDestroyMark(object: TracedObject3D) {
    // XXX only mark object as destroyed after calling destroy so that the
    //     tracer callback doesn't think the object is already destroyed
    if (object.__wle_trace_destroying_data) {
        const [path, children, components, destroyTrace] = object.__wle_trace_destroying_data;

        if (!object.__wle_trace_destroyed_data) {
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

function guardObjectAndMethod(obj: TracedObject3D, methodName: string, args: any[]) {
    strictGuardObject(obj);
    guardObjectMethod(obj, methodName, args, true);
}

function guardObjectAndSetter(obj: TracedObject3D, setterName: string, args: any[]) {
    strictGuardObject(obj);
    guardObjectSetter(obj, setterName, args, true);
}

// track destroyed objects
// XXX destroy method trace hook needs a special case where the destroying path
//     is used to prevent confusion, otherwise there is a <destroying object;...
//     prefix
function traceDestroyMethod(object: TracedObject3D, _methodName: string, args: any[]) {
    let wtfMessage = null;
    let path;
    if (object.__wle_trace_destroying_data) {
        path = object.__wle_trace_destroying_data[0];
    } else if (object.__wle_trace_destroyed_data) {
        path = object.__wle_trace_destroyed_data[0];
        wtfMessage = new StyledMessage().add(' - double-destroy', ERR);
    } else {
        path = StyledMessage.fromObject3D(object);
        wtfMessage = new StyledMessage().add(' - destroy called, but object is not marked as being destroyed', WARN);
    }

    const message = path.add('::destroy(');

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(arg));
    }

    message.add(')');

    if (wtfMessage) {
        message.addSubMessage(wtfMessage);
    }

    message.print(true);
}

injectMethod(Object3D.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Object3D.destroy', traceDestroyMethod),
    beforeHook: (object: TracedObject3D, _methodName: string, _args: any[]) => {
        deepDestroyCheck(object);
    },
    afterHook: (object: TracedObject3D, _methodName: string, _args: any[]) => {
        deepDestroyMark(object);
    },
    exceptionHook: (object: TracedObject3D, _methodName: string, _args: any[]) => {
        deepDestroyMark(object);
    },
});

// guard against reclaim bugs on reclaimed components
injectMethod(Object3D.prototype, 'addComponent', {
    traceHook: controller.guardFunction('trace:Object3D.addComponent', traceObjectMethod),
    beforeHook: (obj: TracedObject3D, methodName: string, args: any[]) => {
        guardObjectAndMethod(obj, methodName, args);
        inAddComponent.add(obj._engine);
    },
    afterHook: (obj: TracedObject3D, _methodName: string, _args: any[], newComp: TracedComponent) => {
        inAddComponent.delete(obj._engine);

        if (newComp) {
            guardReclaimComponent(newComp);
        }
    },
    exceptionHook: (obj: TracedObject3D, _methodName: string, _args: any[], _error: unknown) => {
        inAddComponent.delete(obj._engine);
    },
});

// auto-inject trivial Object3D properties
// HACK objectId is not handled because it's used internally in the WLE API
const PROPERTY_DENY_LIST = new Set([ 'constructor', 'destroy', 'addComponent', 'objectId' ]);

for (const name of Object.getOwnPropertyNames(Object3D.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(Object3D.prototype, name);
    if (descriptor.get || descriptor.set) {
        let getterOptions = null;
        if (descriptor.get) {
            getterOptions = {
                traceHook: controller.guardFunction(`trace:get:Object3D.${name}`, traceObjectProperty),
                beforeHook: strictGuardObject,
            };
        }

        let setterOptions = null;
        if (descriptor.set) {
            setterOptions = {
                traceHook: controller.guardFunction(`trace:set:Object3D.${name}`, traceObjectSet),
                beforeHook: guardObjectAndSetter,
            };
        }

        injectAccessor(Object3D.prototype, name, getterOptions, setterOptions);
    } else {
        injectMethod(Object3D.prototype, name, {
            traceHook: controller.guardFunction(`trace:Object3D.${name}`, traceObjectMethod),
            beforeHook: guardObjectAndMethod,
        });
    }
}