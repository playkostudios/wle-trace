import { Component } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { injectAccessor } from '../../common/inject/injectAccessor.js';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetterIAC } from '../utils/guardSetter.js';
import { traceComponentMethod, traceComponentProperty, traceComponentSetIAC } from '../utils/trace.js';
import { componentDestroyCheck, componentDestroyMark } from '../utils/componentDestroy.js';

export function injectComponent(controller: WLETraceController) {
    const boundTraceComponentProperty = controller.bindFunc(traceComponentProperty);
    const boundTraceComponentSetIAC = controller.bindFunc(traceComponentSetIAC);
    const boundTraceComponentMethod = controller.bindFunc(traceComponentMethod);
    const boundStrictGuardComponent = controller.bindFunc(strictGuardComponent);
    const boundGuardComponentSetterIAC = controller.bindFunc(guardComponentSetterIAC);

    // accessors
    injectAccessor(Component.prototype, 'active', {
        traceHook: controller.guardFunction('trace:get:Component.active', boundTraceComponentProperty),
        beforeHook: boundStrictGuardComponent,
    }, {
        traceHook: controller.guardFunction('trace:set:Component.active', boundTraceComponentSetIAC),
        beforeHook: boundGuardComponentSetterIAC,
    });

    // getters
    // injectAccessor(Component.prototype, 'engine', {
    //     traceHook: controller.guardFunction('trace:get:Component.engine', boundTraceComponentProperty),
    //     beforeHook: boundStrictGuardComponent,
    // });
    injectAccessor(Component.prototype, 'object', {
        traceHook: controller.guardFunction('trace:get:Component.object', boundTraceComponentProperty),
        beforeHook: boundStrictGuardComponent,
    });
    // injectAccessor(Component.prototype, 'type', {
    //     traceHook: controller.guardFunction('trace:get:Component.type', boundTraceComponentProperty),
    //     beforeHook: boundStrictGuardComponent,
    // });

    // methods
    injectMethod(Component.prototype, 'destroy', {
        traceHook: controller.guardFunction('trace:Component.destroy', boundTraceComponentMethod),
        beforeHook: (comp: TracedComponent, _methodName: string) => {
            componentDestroyCheck(controller, comp);
        },
        afterHook: (comp: TracedComponent, _methodName: string) => {
            componentDestroyMark(comp);
        }
    });

    // TODO figure out how to detect calls to onActivate, onDeactivate, onDestroy,
    //      start, init and update, and guard them. can't use prototype injection
    //      because these methods are user-overridden, and users never call super
    // XXX hooks already available for _wljs_* functions, but this can't detect some
    //     cases for onActivate
}