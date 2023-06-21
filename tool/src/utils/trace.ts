import { StyledMessage } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { inAddComponent } from './inAddComponent.js';

// wle-trace message format:
// [wle-trace] <path-part>[<path-part-collision-index>]/<path-part>[<path-part-collision-index>](...):<component-name>[<component-name-collision-index>](|::<method-name>([<argument>](...))|::<property-name>[ = <new-value>])
// example:
// [wle-trace] Grand-parent/Parent[0]/Common Name[3]:component-name[7]::destroy()

controller.registerFeature('trace-sentinel');

const messageAccum: Array<any[]> = [];
window.addEventListener('error', (err) => {
    if (controller.isEnabled('trace-sentinel')) {
        console.error('[wle-trace] trace sentinel triggered by unhandled exception:', err);
        const msgCount = messageAccum.length;
        console.error(`[wle-trace] last ${msgCount} traced calls:`);

        for (const argumentParts of messageAccum) {
            console.debug(...argumentParts);
        }

        messageAccum.length = 0;
        debugger;
    }
})

function traceMessage(message: StyledMessage) {
    if (controller.isEnabled('trace-sentinel')) {
        if (messageAccum.length === 100) {
            messageAccum.shift();
        }

        messageAccum.push(message.preparePrint());
    } else {
        messageAccum.length = 0;
        message.print(true);
    }
}

export function traceObject(object: TracedObject3D) {
    traceMessage(StyledMessage.fromObject3D(object));
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

    traceMessage(message.add(')'));
}

export function traceObjectProperty(object: TracedObject3D, propertyName: string) {
    traceMessage(StyledMessage.fromObject3D(object).add(`::${propertyName}`));
}

export function traceObjectSet(object: TracedObject3D, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromObject3D(object)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(args[0]))
    );
}

export function traceComponent(component: TracedComponent) {
    traceMessage(StyledMessage.fromComponent(component));
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

    traceMessage(message.add(')'));
}

export function traceComponentProperty(component: TracedComponent, propertyName: string) {
    traceMessage(
        StyledMessage.fromComponent(component).add(`::${propertyName}`)
    );
}

export function traceComponentSet(component: TracedComponent, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromComponent(component)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(args[0]))
    );
}

export function traceComponentSetIAC(component: TracedComponent, propertyName: string, args: any[]) {
    if (!inAddComponent.has(component.engine)) {
        traceComponentSet(component, propertyName, args);
    }
}

export function traceValue(value: unknown) {
    traceMessage(StyledMessage.fromValue(value));
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

    traceMessage(message.add(')'));
}

export function traceValueProperty(value: unknown, propertyName: string) {
    traceMessage(StyledMessage.fromValue(value).add(`::${propertyName}`));
}

export function traceValueSet(value: unknown, propertyName: string, args: any[]) {
    traceMessage(
        StyledMessage.fromValue(value)
            .add(`::${propertyName} = `)
            .addSubMessage(StyledMessage.fromValue(args[0]))
    );
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

        traceMessage(message.add(')'));
    }
}

export function makeGlobalObjPropertyTracer(globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string) {
        traceMessage(
            new StyledMessage().add(`${globalObjName}::${propertyName}`)
        );
    }
}


export function makeGlobalObjSetTracer(globalObjName: string) {
    return function(_globalObj: unknown, propertyName: string, args: any[]) {
        traceMessage(
            new StyledMessage()
                .add(`${globalObjName}::${propertyName} = `)
                .addSubMessage(StyledMessage.fromValue(args[0]))
        );
    }
}
