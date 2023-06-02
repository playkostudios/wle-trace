import { Component } from '@wonderlandengine/api';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetter } from '../utils/guardSetter.js';
import { traceComponentMethod, traceComponentProperty, traceComponentSet } from '../utils/trace.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';

controller.registerFeature('trace:destruction:Component');
controller.registerFeature('destruction:Component');

export function componentDestroyCheck(comp: TracedComponent) {
    if (comp.__wle_trace_destroyed_data) {
        new StyledMessage()
            .add('double-destroy detected in component ', ERR)
            .addSubMessage(comp.__wle_trace_destroyed_data[0])
            .print(true, ERR);

        triggerGuardBreakpoint(true);
    } else if (comp.__wle_trace_destroying_data) {
        // do nothing
    } else if (comp._id === -1) {
        new StyledMessage()
            .add('double-destroy detected in unexpected destroyed component')
            .print(true, ERR);

        triggerGuardBreakpoint(true);
    } else {
        const path = StyledMessage.fromComponent(comp);

        if (controller.isEnabled('trace:destruction:Component')) {
            const message = new StyledMessage();
            message.add('destroying Component ');
            message.addSubMessage(path);
            message.add(` (ID ${comp._id})`);
            message.print(true);
        }

        triggerBreakpoint('destruction:Component');

        comp.__wle_trace_destroying_data = [path, getDestructionTrace()];
    }
}

export function componentDestroyMark(comp: TracedComponent) {
    // XXX only mark components as destroyed after calling destroy so that the
    //     tracer callback doesn't think the object is already destroyed, and so
    //     that we can get the component index as part of the trace
    if ('__wle_trace_destroying_data' in comp) {
        comp.__wle_trace_destroyed_data = comp.__wle_trace_destroying_data;
        delete comp.__wle_trace_destroying_data;
    }
}

// accessors
injectAccessor(Component.prototype, 'active', {
    traceHook: controller.guardFunction('trace:get:Component.active', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:Component.active', traceComponentSet),
    beforeHook: guardComponentSetter,
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
// XXX can inject into _wljs_* functions