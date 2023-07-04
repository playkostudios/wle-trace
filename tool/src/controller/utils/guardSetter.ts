import { Component, Material, Mesh, Object3D, Texture } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from '../StyledMessage.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { inAddComponent } from './inAddComponent.js';
import { guardMesh } from './guardMesh.js';
import { guardTexture } from './guardTexture.js';
import { guardMaterial } from './guardMaterial.js';

function originFactory(isObject: boolean, controller: WLETraceController, objOrComp: TracedObject3D | TracedComponent, setterName: string) {
    const message = isObject ? StyledMessage.fromObject3D(controller, objOrComp as TracedObject3D) : StyledMessage.fromComponent(controller, objOrComp as TracedComponent);
    return message.add(`::${setterName} = `);
}

function guardSetter(isObject: boolean, controller: WLETraceController, objOrComp: TracedObject3D | TracedComponent, setterName: string, args: any[], strict: boolean) {
    if (!controller.isEnabled('guard:setters')) {
        return;
    }

    if (isObject) {
        guardObject(controller, objOrComp as TracedObject3D, strict);
    } else {
        guardComponent(controller, objOrComp as TracedComponent, strict);
    }

    const value = args[0];
    if (typeof value === 'object') {
        if (value instanceof Object3D) {
            guardObject(controller, value as unknown as TracedObject3D, strict, originFactory.bind(null, isObject, controller, objOrComp, setterName));
        } else if (value instanceof Component) {
            guardComponent(controller, value as unknown as TracedComponent, strict, originFactory.bind(null, isObject, controller, objOrComp, setterName));
        } else if (value instanceof Mesh) {
            guardMesh(controller, value, strict, originFactory.bind(null, isObject, controller, objOrComp, setterName));
        } else if (value instanceof Texture) {
            guardTexture(controller, value, strict, originFactory.bind(null, isObject, controller, objOrComp, setterName));
        } else if (value instanceof Material) {
            guardMaterial(controller, value, strict, originFactory.bind(null, isObject, controller, objOrComp, setterName));
        }
    }
}

export const guardObjectSetter = guardSetter.bind(null, true);
export const guardComponentSetter = guardSetter.bind(null, false);

export function guardComponentSetterIAC(controller: WLETraceController, comp: TracedComponent, setterName: string, args: any[], strict: boolean) {
    if (!inAddComponent.has(comp.engine)) {
        guardComponentSetter(controller, comp, setterName, args, strict);
    }
}
