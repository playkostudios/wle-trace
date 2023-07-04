import { NONE, StyledMessage } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { inAddComponent } from './inAddComponent.js';

// wle-trace message format:
// [wle-trace] <path-part>[<path-part-collision-index>]/<path-part>[<path-part-collision-index>](...):<component-name>[<component-name-collision-index>](|::<method-name>([<argument>](...))|::<property-name>[ = <new-value>])
// example:
// [wle-trace] Grand-parent/Parent[0]/Common Name[3]:component-name[7]::destroy()

function traceMessage(message: StyledMessage) {
    if (message.controller.isEnabled('trace-sentinel')) {
        const timestamp = new Date().toISOString();
        message.controller.queueTrace(message.preparePrint(NONE, `wle-trace QUEUED_TRACE:${timestamp}`));
    } else {
        message.print(true);
    }
}

export function traceObject(controller: WLETraceController, object: TracedObject3D) {
    traceMessage(StyledMessage.fromObject3D(controller, object));
}

export function traceObjectMethod(controller: WLETraceController, object: TracedObject3D, methodName: string, args: any[]) {
    const message = StyledMessage.fromObject3D(controller, object).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(controller, arg));
    }

    traceMessage(message.add(')'));
}

export function traceObjectProperty(controller: WLETraceController, object: TracedObject3D, propertyName: string) {
    traceMessage(StyledMessage.fromObject3D(controller, object).add(`::${propertyName}`));
}

export function traceObjectSet(controller: WLETraceController, object: TracedObject3D, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromObject3D(controller, object)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(controller, args[0]))
    );
}

export function traceComponent(controller: WLETraceController, component: TracedComponent) {
    traceMessage(StyledMessage.fromComponent(controller, component));
}

export function traceComponentMethod(controller: WLETraceController, component: TracedComponent, methodName: string, args: any[]) {
    const message = StyledMessage.fromComponent(controller, component).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(controller, arg));
    }

    traceMessage(message.add(')'));
}

export function traceComponentProperty(controller: WLETraceController, component: TracedComponent, propertyName: string) {
    traceMessage(
        StyledMessage.fromComponent(controller, component).add(`::${propertyName}`)
    );
}

export function traceComponentSet(controller: WLETraceController, component: TracedComponent, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromComponent(controller, component)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(controller, args[0]))
    );
}

export function traceComponentSetIAC(controller: WLETraceController, component: TracedComponent, propertyName: string, args: any[]) {
    if (!inAddComponent.has(component.engine)) {
        traceComponentSet(controller, component, propertyName, args);
    }
}

export function traceValue(controller: WLETraceController, value: unknown) {
    traceMessage(StyledMessage.fromValue(controller, value));
}

export function traceValueMethod(controller: WLETraceController, value: unknown, methodName: string, args: any[]) {
    const message = StyledMessage.fromValue(controller, value).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(controller, arg));
    }

    traceMessage(message.add(')'));
}

export function traceValueProperty(controller: WLETraceController, value: unknown, propertyName: string) {
    traceMessage(StyledMessage.fromValue(controller, value).add(`::${propertyName}`));
}

export function traceValueSet(controller: WLETraceController, value: unknown, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromValue(controller, value)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(controller, args[0]))
    );
}

export function makeGlobalObjMethodTracer(controller: WLETraceController, globalObjName: string) {
    return function(_globalObj: unknown, methodName: string, args: any[]) {
        const message = new StyledMessage(controller).add(`${globalObjName}::${methodName}(`);

        let first = true;
        for (const arg of args) {
            if (first) {
                first = false;
            } else {
                message.add(', ');
            }

            message.addSubMessage(StyledMessage.fromValue(controller, arg));
        }

        traceMessage(message.add(')'));
    }
}

export function makeGlobalObjPropertyTracer(controller: WLETraceController, globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string) {
        traceMessage(
            new StyledMessage(controller).add(`${globalObjName}::${propertyName}`)
        );
    }
}


export function makeGlobalObjSetTracer(controller: WLETraceController, globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string, args: any[]) {
        traceMessage(
            new StyledMessage(controller)
                .add(`${globalObjName}::${propertyName} = `)
                .addSubMessage(StyledMessage.fromValue(controller, args[0]))
        );
    }
}
