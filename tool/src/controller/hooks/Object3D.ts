import { Object3D } from '@wonderlandengine/api';
import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { injectAccessor } from '../../common/inject/injectAccessor.js';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { guardObjectMethod } from '../utils/guardMethod.js';
import { strictGuardObject } from '../utils/guardObject.js';
import { guardReclaimComponent } from '../utils/guardReclaim.js';
import { guardObjectSetter } from '../utils/guardSetter.js';
import { traceObjectMethod, traceObjectProperty, traceObjectSet } from '../utils/trace.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';
import { inAddComponent } from '../utils/inAddComponent.js';
import { deepDestroyCheck, deepDestroyMark } from '../utils/objectDestroy.js';

function guardObjectAndMethod(controller: WLETraceController, obj: TracedObject3D, methodName: string, args: any[]) {
    strictGuardObject(controller, obj);
    guardObjectMethod(controller, obj, methodName, args, true);
}

function guardObjectAndSetter(controller: WLETraceController, obj: TracedObject3D, setterName: string, args: any[]) {
    strictGuardObject(controller, obj);
    guardObjectSetter(controller, obj, setterName, args, true);
}

// track destroyed objects
// XXX destroy method trace hook needs a special case where the destroying path
//     is used to prevent confusion, otherwise there is a <destroying object;...
//     prefix
function traceDestroyMethod(controller: WLETraceController, object: TracedObject3D, _methodName: string, args: any[]) {
    // TODO wtfMessage should be done as a debug feature like in other places
    //      where we log/breakpoint at unexpected conditions
    let wtfMessage = null;
    let path;
    if (object.__wle_trace_destroying_data) {
        path = object.__wle_trace_destroying_data[0];
    } else if (object.__wle_trace_destroyed_data) {
        path = object.__wle_trace_destroyed_data[0];
        wtfMessage = new StyledMessage(controller).add(' - double-destroy', ERR);
    } else {
        path = StyledMessage.fromObject3D(controller, object);
        wtfMessage = new StyledMessage(controller).add(' - destroy called, but object is not marked as being destroyed', WARN);
    }

    const message = path.add('::destroy(');

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(controller, arg));
    }

    message.add(')');

    if (wtfMessage) {
        message.addSubMessage(wtfMessage);
    }

    message.print(true);
}

export function injectObject3D(controller: WLETraceController) {
    const boundGuardObjectAndMethod = controller.bindFunc(guardObjectAndMethod);
    const boundGuardObjectAndSetter = controller.bindFunc(guardObjectAndSetter);
    const boundTraceDestroyMethod = controller.bindFunc(traceDestroyMethod);
    const boundTraceObjectProperty = controller.bindFunc(traceObjectProperty);
    const boundTraceObjectSet = controller.bindFunc(traceObjectSet);
    const boundTraceObjectMethod = controller.bindFunc(traceObjectMethod);
    const boundStrictGuardObject = controller.bindFunc(strictGuardObject);

    injectMethod(Object3D.prototype, 'destroy', {
        traceHook: controller.guardFunction('trace:Object3D.destroy', boundTraceDestroyMethod),
        beforeHook: (object: TracedObject3D, _methodName: string, _args: any[]) => {
            deepDestroyCheck(controller, object);
        },
        afterHook: (object: TracedObject3D, _methodName: string, _args: any[]) => {
            deepDestroyMark(object);
        },
        exceptionHook: (object: TracedObject3D, _methodName: string, _args: any[], _error: unknown) => {
            deepDestroyMark(object);
        },
    });

    // guard against reclaim bugs on reclaimed components
    injectMethod(Object3D.prototype, 'addComponent', {
        traceHook: controller.guardFunction('trace:Object3D.addComponent', boundTraceObjectMethod),
        beforeHook: (obj: TracedObject3D, methodName: string, args: any[]) => {
            boundGuardObjectAndMethod(obj, methodName, args);
            inAddComponent.add(obj._engine);
        },
        afterHook: (obj: TracedObject3D, _methodName: string, _args: any[], newComp: TracedComponent) => {
            const engine = obj._engine;
            if (inAddComponent.has(engine)) {
                inAddComponent.delete(engine);

                if (newComp) {
                    guardReclaimComponent(controller, newComp);
                }
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
                    traceHook: controller.guardFunction(`trace:get:Object3D.${name}`, boundTraceObjectProperty),
                    beforeHook: boundStrictGuardObject,
                };
            }

            let setterOptions = null;
            if (descriptor.set) {
                setterOptions = {
                    traceHook: controller.guardFunction(`trace:set:Object3D.${name}`, boundTraceObjectSet),
                    beforeHook: boundGuardObjectAndSetter,
                };
            }

            injectAccessor(Object3D.prototype, name, getterOptions, setterOptions);
        } else {
            injectMethod(Object3D.prototype, name, {
                traceHook: controller.guardFunction(`trace:Object3D.${name}`, boundTraceObjectMethod),
                beforeHook: boundGuardObjectAndMethod,
            });
        }
    }
}