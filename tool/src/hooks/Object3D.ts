import { Object3D } from '@wonderlandengine/api';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { guardObjectMethod } from '../utils/guardMethod.js';
import { strictGuardObject } from '../utils/guardObject.js';
import { guardReclaimComponent } from '../utils/guardReclaim.js';
import { guardObjectSetter } from '../utils/guardSetter.js';
import { traceObjectMethod, traceObjectProperty, traceObjectSet } from '../utils/trace.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { inAddComponent } from '../utils/inAddComponent.js';
import { deepDestroyCheck, deepDestroyMark } from '../utils/objectDestroy.js';

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