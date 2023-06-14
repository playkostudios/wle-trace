import { Component } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetterIAC } from '../utils/guardSetter.js';
import { traceComponentMethod, traceComponentProperty, traceComponentSetIAC } from '../utils/trace.js';
import { componentDestroyCheck, componentDestroyMark } from '../utils/componentDestroy.js';

// accessors
injectAccessor(Component.prototype, 'active', {
    traceHook: controller.guardFunction('trace:get:Component.active', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:Component.active', traceComponentSetIAC),
    beforeHook: guardComponentSetterIAC,
});

// getters
// injectAccessor(Component.prototype, 'engine', {
//     traceHook: controller.guardFunction('trace:get:Component.engine', traceComponentProperty),
//     beforeHook: strictGuardComponent,
// });
injectAccessor(Component.prototype, 'object', {
    traceHook: controller.guardFunction('trace:get:Component.object', traceComponentProperty),
    beforeHook: strictGuardComponent,
});
// injectAccessor(Component.prototype, 'type', {
//     traceHook: controller.guardFunction('trace:get:Component.type', traceComponentProperty),
//     beforeHook: strictGuardComponent,
// });

// methods
injectMethod(Component.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Component.destroy', traceComponentMethod),
    beforeHook: (comp: TracedComponent, _methodName: string) => {
        componentDestroyCheck(comp);
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