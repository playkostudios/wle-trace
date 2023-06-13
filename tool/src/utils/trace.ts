import { StyledMessage } from '../StyledMessage.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { inAddComponent } from './inAddComponent.js';

// wle-trace message format:
// [wle-trace] <path-part>[<path-part-collision-index>]/<path-part>[<path-part-collision-index>](...):<component-name>[<component-name-collision-index>](|::<method-name>([<argument>](...))|::<property-name>[ = <new-value>])
// example:
// [wle-trace] Grand-parent/Parent[0]/Common Name[3]:component-name[7]::destroy()

export function traceObject(object: TracedObject3D) {
    StyledMessage.fromObject3D(object)
        .print(true);
}

export function traceObjectMethod(object: TracedObject3D, methodName: string, args: any[]) {
    const message = StyledMessage.fromObject3D(object).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(arg));
    }

    message.add(')').print(true);
}

export function traceObjectProperty(object: TracedObject3D, propertyName: string) {
    StyledMessage.fromObject3D(object)
        .add(`::${propertyName}`)
        .print(true);
}

export function traceObjectSet(object: TracedObject3D, propertyName: string, args: any[]) {
    StyledMessage.fromObject3D(object)
        .add(`::${propertyName} = `)
        .addSubMessage(StyledMessage.fromValue(args[0]))
        .print(true);
}

export function traceComponent(component: TracedComponent) {
    StyledMessage.fromComponent(component)
        .print(true);
}

export function traceComponentMethod(component: TracedComponent, methodName: string, args: any[]) {
    const message = StyledMessage.fromComponent(component).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(arg));
    }

    message.add(')').print(true);
}

export function traceComponentProperty(component: TracedComponent, propertyName: string) {
    StyledMessage.fromComponent(component)
        .add(`::${propertyName}`)
        .print(true);
}

export function traceComponentSet(component: TracedComponent, propertyName: string, args: any[]) {
    StyledMessage.fromComponent(component)
        .add(`::${propertyName} = `)
        .addSubMessage(StyledMessage.fromValue(args[0]))
        .print(true);
}

export function traceComponentSetIAC(component: TracedComponent, propertyName: string, args: any[]) {
    if (!inAddComponent.has(component.engine)) {
        traceComponentSet(component, propertyName, args);
    }
}

export function traceValue(value: unknown) {
    StyledMessage.fromValue(value)
        .print(true);
}

export function traceValueMethod(value: unknown, methodName: string, args: any[]) {
    const message = StyledMessage.fromValue(value).add(`::${methodName}(`);

    let first = true;
    for (const arg of args) {
        if (first) {
            first = false;
        } else {
            message.add(', ');
        }

        message.addSubMessage(StyledMessage.fromValue(arg));
    }

    message.add(')').print(true);
}

export function traceValueProperty(value: unknown, propertyName: string) {
    StyledMessage.fromValue(value)
        .add(`::${propertyName}`)
        .print(true);
}

export function traceValueSet(value: unknown, propertyName: string, args: any[]) {
    StyledMessage.fromValue(value)
        .add(`::${propertyName} = `)
        .addSubMessage(StyledMessage.fromValue(args[0]))
        .print(true);
}

export function makeGlobalObjMethodTracer(globalObjName: string) {
    return function(_globalObj: unknown, methodName: string, args: any[]) {
        const message = new StyledMessage().add(`${globalObjName}::${methodName}(`);

        let first = true;
        for (const arg of args) {
            if (first) {
                first = false;
            } else {
                message.add(', ');
            }

            message.addSubMessage(StyledMessage.fromValue(arg));
        }

        message.add(')').print(true);
    }
}

export function makeGlobalObjPropertyTracer(globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string) {
        new StyledMessage()
            .add(`${globalObjName}::${propertyName}`)
            .print(true);
    }
}


export function makeGlobalObjSetTracer(globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string, args: any[]) {
        new StyledMessage()
            .add(`${globalObjName}::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(args[0]))
            .print(true);
    }
}
