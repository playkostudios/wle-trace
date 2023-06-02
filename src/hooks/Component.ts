import { Component } from '@wonderlandengine/api';
import { ERR, StyledMessage } from './StyledMessage.js';
import { controller } from './WLETraceController.js';
import { getDestructionTrace } from './getDestructionTrace.js';
import { strictGuardComponent } from './guardComponent.js';
import { guardComponentSetter } from './guardSetter.js';
import { injectAccessor, injectMethod } from './inject.js';
import { traceComponentMethod, traceComponentProperty, traceComponentSet } from './trace.js';
import { triggerBreakpoint } from './triggerBreakpoint.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import type { TracedComponent } from '../types/TracedComponent.js';

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
injectAccessor(Component.prototype, 'active', traceComponentProperty, traceComponentSet, strictGuardComponent, guardComponentSetter, 'trace:get:Component.active', 'trace:set:Component.active');

// getters
injectAccessor(Component.prototype, 'engine', traceComponentProperty, null, strictGuardComponent, null, 'trace:get:Component.engine', null);
injectAccessor(Component.prototype, 'object', traceComponentProperty, null, strictGuardComponent, null, 'trace:get:Component.object', null);
injectAccessor(Component.prototype, 'type', traceComponentProperty, null, strictGuardComponent, null, 'trace:get:Component.type', null);

// methods
injectMethod(Component.prototype, 'destroy', traceComponentMethod, (comp: TracedComponent, _methodName: string) => {
    componentDestroyCheck(comp);
}, (comp: TracedComponent, _methodName: string) => {
    componentDestroyMark(comp);
}, 'trace:Component.destroy');

// TODO figure out how to detect calls to onActivate, onDeactivate, onDestroy,
//      start, init and update, and guard them. can't use prototype injection
//      because these methods are user-overridden, and users never call super