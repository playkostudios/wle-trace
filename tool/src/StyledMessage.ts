import { Component, Material, Mesh, Object3D, Texture, type WonderlandEngine } from '@wonderlandengine/api';
import { origChildrenGetter, origGetComponentsMethod, origNameGetter, origParentGetter, origObjectGetter, origTypeGetter } from './hooks/orig-properties.js';
import { controller } from './WLETraceController.js';
import { type TracedObject3D } from './types/TracedObject3D.js';
import { type TracedComponent } from './types/TracedComponent.js';

export const DEFAULT = -1;
export const NONE = 0;
export const WARN = 1;
export const ERR = 2;
export const STR = 3;

const STYLES = [
    'color: initial',
    'color: gold',
    'color: orangered',
    'color: olive',
];

const LOG_LEVEL_TAGS = [
    '',
    ' WARN',
    ' ERR',
];

const rootObjs = new WeakMap();
function getRootObj(engine: WonderlandEngine) {
    let rootObj = rootObjs.get(engine);
    if (!rootObj) {
        rootObj = engine.wrapObject(0);
        rootObjs.set(engine, rootObj);
    }

    return rootObj;
}

function isFunction(funcOrClass: Function) {
    const propertyNames = Object.getOwnPropertyNames(funcOrClass);
    return (!propertyNames.includes('prototype') || propertyNames.includes('arguments'));
}

controller.registerFeature('fast-trace');
controller.registerFeature('fast-objects');

export class StyledMessage {
    parts: (string | number)[] = [];

    static fromObject3D(obj: TracedObject3D) {
        const message = new StyledMessage();

        // XXX special case for root object
        const objId = obj._objectId;
        if (objId === 0) {
            return message.add('<root>', WARN);
        }

        // XXX special case if fast-objects is enabled
        if (controller.isEnabled('fast-objects')) {
            if (obj._objectId === -1) {
                return message.add(`<destroyed object>`, ERR);
            } else {
                return message.add(`<object ${objId}>`, NONE);
            }
        }

        let first = true;
        while (obj) {
            if (first) {
                first = false;
            } else {
                message.unshift('/');
            }

            if (obj.__wle_trace_destroyed_data) {
                // XXX object already destroyed, get path at destruction
                message.unshift('>', ERR);
                message.unshiftSubMessage(obj.__wle_trace_destroyed_data[0]);
                message.unshift('<destroyed object; before destroy: ', ERR);
                break;
            }

            if (obj.__wle_trace_destroying_data) {
                // XXX object already being destroyed, get path at destruction
                message.unshift('>', WARN);
                message.unshiftSubMessage(obj.__wle_trace_destroying_data[0]);
                message.unshift('<destroying object; before destroy: ', WARN);
                break;
            }

            if (obj._objectId === -1) {
                message.unshift('<destroyed object; destruction could not be detected>', ERR);
                break;
            }

            let name, nameStyle;
            let badName = false;
            try {
                name = origNameGetter.apply(obj);

                if (name === '') {
                    name = `<unnamed ${objId}>`;
                    nameStyle = NONE;
                } else {
                    nameStyle = STR;
                }
            } catch (_) {
                badName = true;
                name = '<invalid name (exception)>';
                nameStyle = ERR;
            }

            let parent;
            try {
                parent = origParentGetter.apply(obj);
            } catch (_) {
                message.unshift(']');
                message.unshift(`<invalid (can't get parent)>`, ERR);
                message.unshift('[');
                message.unshift(name, nameStyle);
                message.unshift('/');
                message.unshift('<invalid parent (exception)>', ERR);
                break;
            }

            if (!badName) {
                let children;
                if (parent) {
                    children = origChildrenGetter.apply(parent);
                } else {
                    children = origChildrenGetter.apply(getRootObj(obj._engine));
                }

                let idx = -1;
                let nameClashCount = 0;
                for (const child of children) {
                    if (child === obj) {
                        idx = nameClashCount++;
                        continue;
                    }

                    let childName;
                    try {
                        childName = origNameGetter.apply(child);
                    } catch (_) {
                        // TODO should this be reported when it happens?
                        continue;
                    }

                    if (name === childName) {
                        nameClashCount++;
                    }
                }

                if (nameClashCount > 1) {
                    message.unshift(`[${idx}]`);
                } else if (idx < 0) {
                    message.unshift(']');
                    message.unshift(`<not a child of parent>`, ERR);
                    message.unshift('[');
                }
            }

            message.unshift(name, nameStyle);
            obj = parent;
        }

        return message;
    }

    static fromComponent(component: TracedComponent) {
        let obj = null;

        if (component._object) {
            obj = component._object;
        } else if (component._id !== -1) {
            obj = origObjectGetter.apply(component);
        }

        let message;
        if (obj) {
            message = StyledMessage.fromObject3D(obj);
        } else {
            message = new StyledMessage();
            message.add('<no object attached>', ERR);
        }

        message.add(':');

        // HACK _id is not guaranteed to be -1 for destroyed components. if the
        //      component is destroyed as a side-effect of an object destroy,
        //      then _id will not be set to -1
        if (component._id === -1) {
            const compType = (component.constructor as { TypeName?: string }).TypeName ?? null;

            if (compType) {
                message.add(compType, STR);
            } else {
                message.add('<unknown component type>', ERR);
            }

            message.add('[');
            message.add('<unknown index>', ERR);
            message.add(']');
        } else {
            const compType = origTypeGetter.apply(component);
            message.add(compType, STR);

            if (obj && obj._objectId !== -1) {
                const compList = origGetComponentsMethod.apply(obj, [compType]);
                const idx = compList.indexOf(component);
                if (idx > 0) {
                    message.add(`[${idx}]`);
                } else if (idx < 0) {
                    message.add('[');
                    message.add(`<invalid index (${idx})>`, ERR);
                    message.add(']');
                }
            } else {
                message.add('[');
                message.add('<unknown index>', ERR);
                message.add(']');
            }
        }

        return message;
    }

    static fromMesh(meshOrIdx: Mesh | number) {
        if (typeof meshOrIdx !== 'number') {
            meshOrIdx = meshOrIdx._index;
        }

        return new StyledMessage().add(`Mesh<${meshOrIdx}>`);
    }

    static fromTexture(textureOrId: Texture | number) {
        if (typeof textureOrId !== 'number') {
            textureOrId = textureOrId.id;
        }

        return new StyledMessage().add(`Texture<${textureOrId}>`);
    }

    static fromValue(value: unknown) {
        const message = new StyledMessage();

        if (value === null) {
            message.add('null');
            return message;
        }

        switch (typeof value) {
        case 'undefined':
            message.add('undefined');
            break;
        case 'boolean':
            message.add(value ? 'true' : 'false');
            break;
        case 'number':
            message.add(`${value}`);
            break;
        case 'bigint':
            message.add(`BigInt{${value}}`);
            break;
        case 'string':
            message.add('"');
            message.add(value, STR);
            message.add('"');
            break;
        case 'symbol':
            message.add('Symbol{');
            message.addSubMessage(StyledMessage.fromValue(value.description));
            message.add('}');
            break;
        case 'function':
            if (isFunction(value)) {
                message.add('Function{');
                message.add(value.name, STR);
                message.add('}');
            } else {
                message.add('Class{');
                message.add(value.name, STR);
                message.add('}');
            }
            break;
        case 'object':
            if (Array.isArray(value)) {
                let first = true;
                message.add('[');

                for (const subValue of value) {
                    if (first) {
                        first = false;
                    } else {
                        message.add(', ');
                    }

                    message.addSubMessage(StyledMessage.fromValue(subValue));
                }

                message.add(']');
            } else {
                const ctor = value.constructor;
                if (ctor === Object) {
                    message.add('Object{');

                    let first = true;
                    for (const name of Object.getOwnPropertyNames(value)) {
                        const descriptor = Object.getOwnPropertyDescriptor(value, name);

                        if (first) {
                            first = false;
                        } else {
                            message.add(', ');
                        }

                        message.add(name, STR);

                        if (descriptor) {
                            const hasGet = descriptor.get !== undefined;
                            const hasSet = descriptor.set !== undefined;
                            if (hasGet && hasSet) {
                                // accessor with both getter and setter
                                message.add(' <getter/setter>');
                            } else if (hasGet) {
                                // accessor with only getter
                                message.add(' <getter>');
                            } else if (hasSet) {
                                // accessor with only setter
                                message.add(' <setter>');
                            } else {
                                const subValue = descriptor.value;
                                if ((typeof subValue === 'function') && isFunction(subValue)) {
                                    // method (or function, but no difference)
                                    message.add('()');
                                } else {
                                    // value
                                    message.add(': ');
                                    message.addSubMessage(StyledMessage.fromValue(subValue));
                                }
                            }
                        } else {
                            message.add(' <unknown>', ERR);
                        }
                    }

                    message.add('}');
                } else if (value instanceof Object3D) {
                    message.add('Object3D{');
                    message.addSubMessage(StyledMessage.fromObject3D(value as unknown as TracedObject3D));
                    message.add('}');
                } else if (value instanceof Component) {
                    message.add('Component{');
                    message.addSubMessage(StyledMessage.fromComponent(value as unknown as TracedComponent));
                    message.add('}');
                } else if (value instanceof Mesh) {
                    message.addSubMessage(StyledMessage.fromMesh(value));
                } else if (value instanceof Texture) {
                    message.addSubMessage(StyledMessage.fromTexture(value));
                } else if (value instanceof Texture) {
                    message.add(`Texture<${(value as unknown as { _id: number })._id}>`);
                } else if (value instanceof Material) {
                    message.add(`Material<${value._index}>`);
                } else {
                    message.add('Instance{');
                    message.add(ctor.name, STR);
                    message.add('}');
                }
            }
            break;
        }

        return message;
    }

    unshift(string: string, style: number = DEFAULT) {
        this.parts.unshift(string, style);
        return this;
    }

    unshiftSubMessage(message: StyledMessage) {
        this.parts.unshift(...message.parts);
        return this;
    }

    add(string: string, style: number = DEFAULT) {
        this.parts.push(string, style);
        return this;
    }

    addSubMessage(message: StyledMessage) {
        this.parts.push(...message.parts);
        return this;
    }

    reverse() {
        const partsOrig = [...this.parts];
        const iMax = partsOrig.length;

        for (let i = 0, j = iMax - 2; i < iMax; j -= 2) {
            this.parts[i++] = partsOrig[j];
            this.parts[i++] = partsOrig[j + 1];
        }

        return this;
    }

    resolveStyle(style: number, defaultStyle: number) {
        if (style === DEFAULT) {
            return defaultStyle;
        } else {
            return style;
        }
    }

    print(trace = false, logLevel: number = NONE, prefix = 'wle-trace') {
        const formatParts: string[] = [];
        const argumentParts: (string | number)[] = [];
        const iMax = this.parts.length;

        for (let i = 0; i < iMax; i += 2) {
            formatParts.push('%c%s');
            argumentParts.push(STYLES[this.resolveStyle(this.parts[i + 1] as number, logLevel)], this.parts[i] as string);
        }

        formatParts.unshift(`%c[${prefix}${LOG_LEVEL_TAGS[logLevel]}] `);
        argumentParts.unshift(formatParts.join(''), STYLES[logLevel]);

        // XXX console.error and console.warn creates too much lag because it
        //     auto-expands, so it's not used
        // if (logLevel === ERR) {
        //     console.error(...argumentParts);
        // } else if (logLevel === WARN) {
        //     console.warn(...argumentParts);
        // } else if (trace) {
        //     console.groupCollapsed(...argumentParts);
        //     console.trace();
        //     console.groupEnd();
        // } else {
        //     console.debug(...argumentParts);
        // }

        if (trace) {
            if (controller.isEnabled('fast-trace')) {
                console.debug(...argumentParts);
            } else {
                console.groupCollapsed(...argumentParts);
                console.trace();
                console.groupEnd();
            }
        } else {
            console.debug(...argumentParts);
        }
    }

    toString() {
        const parts = [];
        const iMax = this.parts.length;
        for (let i = 0; i < iMax; i += 2) {
            parts.push(this.parts[i]);
        }

        return parts.join('');
    }

    clone() {
        return new StyledMessage().addSubMessage(this);
    }
}