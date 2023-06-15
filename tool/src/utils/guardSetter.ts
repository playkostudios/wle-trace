import { Component, Material, Mesh, Object3D, Texture } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from '../StyledMessage.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { inAddComponent } from './inAddComponent.js';
import { guardMesh } from './guardMesh.js';
import { guardTexture } from './guardTexture.js';
import { guardMaterial } from './guardMaterial.js';

controller.registerFeature('guard:setters');

function originFactory(isObject: boolean, objOrComp: TracedObject3D | TracedComponent, setterName: string) {
    const message = isObject ? StyledMessage.fromObject3D(objOrComp as TracedObject3D) : StyledMessage.fromComponent(objOrComp as TracedComponent);
    return message.add(`::${setterName} = `);
}

export function guardSetter(isObject: boolean, objOrComp: TracedObject3D | TracedComponent, setterName: string, args: any[], strict: boolean) {
    if (!controller.isEnabled('guard:setters')) {
        return;
    }

    if (isObject) {
        guardObject(objOrComp as TracedObject3D, strict);
    } else {
        guardComponent(objOrComp as TracedComponent, strict);
    }

    const value = args[0];
    if (typeof value === 'object') {
        if (value instanceof Object3D) {
            guardObject(value as unknown as TracedObject3D, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Component) {
            guardComponent(value as unknown as TracedComponent, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Mesh) {
            guardMesh(value, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Texture) {
            guardTexture(value, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Material) {
            guardMaterial(value, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        }
    }
}

export const guardObjectSetter = guardSetter.bind(null, true);
export const guardComponentSetter = guardSetter.bind(null, false);

export function guardComponentSetterIAC(comp: TracedComponent, setterName: string, args: any[], strict: boolean) {
    if (!inAddComponent.has(comp.engine)) {
        guardComponentSetter(comp, setterName, args, strict);
    }
}
