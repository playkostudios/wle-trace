import { StyledMessage } from './StyledMessage';

// wle-trace message format:
// [wle-trace] <path-part>[<path-part-collision-index>]/<path-part>[<path-part-collision-index>](...):<component-name>[<component-name-collision-index>](|::<method-name>([<argument>](...))|::<property-name>[ = <new-value>])
// example:
// [wle-trace] Grand-parent/Parent[0]/Common Name[3]:component-name[7]::destroy()

export function traceObject(object) {
    StyledMessage.fromObject3D(object)
        .print(true);
}

export function traceObjectMethod(object, methodName, args) {
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

export function traceObjectProperty(object, propertyName) {
    StyledMessage.fromObject3D(object)
        .add(`::${propertyName}`)
        .print(true);
}

export function traceObjectSet(object, propertyName, value) {
    StyledMessage.fromObject3D(object)
        .add(`::${propertyName} = `)
        .addSubMessage(StyledMessage.fromValue(value))
        .print(true);
}

export function traceComponent(component) {
    StyledMessage.fromComponent(component)
        .print(true);
}

export function traceComponentMethod(component, methodName, args) {
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

export function traceComponentProperty(component, propertyName) {
    StyledMessage.fromComponent(component)
        .add(`::${propertyName}`)
        .print(true);
}

export function traceComponentSet(component, propertyName, value) {
    StyledMessage.fromComponent(component)
        .add(`::${propertyName} = `)
        .addSubMessage(StyledMessage.fromValue(value))
        .print(true);
}