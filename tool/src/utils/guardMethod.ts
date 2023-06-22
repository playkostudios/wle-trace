import { Component, Material, Mesh, Object3D, Texture } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from '../StyledMessage.js';
import { type TracedComponent } from '../types/TracedComponent.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { guardMesh } from './guardMesh.js';
import { guardTexture } from './guardTexture.js';
import { guardMaterial } from './guardMaterial.js';

function originFactory(isObject: boolean, controller: WLETraceController, objOrComp: TracedComponent | TracedObject3D, methodName: string, idx: number) {
    const message = isObject ? StyledMessage.fromObject3D(controller, objOrComp as TracedObject3D) : StyledMessage.fromComponent(controller, objOrComp as TracedComponent);
    return message.add(`::${methodName}(...)::args[${idx}] - `);
}

function guardMethod(isObject: boolean, controller: WLETraceController, objOrComp: TracedComponent | TracedObject3D, methodName: string, args: any[], strict: boolean) {
    if (args.length === 0 || !controller.isEnabled('guard:methods')) {
        return;
    }

    if (isObject) {
        guardObject(controller, objOrComp as TracedObject3D, strict);
    } else {
        guardComponent(controller, objOrComp as TracedComponent, strict);
    }

    const originFactoryBind = originFactory.bind(null, isObject, controller, objOrComp, methodName);

    let idx = 0;
    for (const arg of args) {
        if (typeof arg === 'object') {
            if (arg instanceof Object3D) {
                guardObject(controller, arg as unknown as TracedObject3D, strict, originFactoryBind.bind(null, idx));
            } else if (arg instanceof Component) {
                guardComponent(controller, arg as unknown as TracedComponent, strict, originFactoryBind.bind(null, idx));
            } else if (arg instanceof Mesh) {
                guardMesh(controller, arg, strict, originFactoryBind.bind(null, idx));
            } else if (arg instanceof Texture) {
                guardTexture(controller, arg, strict, originFactoryBind.bind(null, idx));
            } else if (arg instanceof Material) {
                guardMaterial(controller, arg, strict, originFactoryBind.bind(null, idx));
            }
        }

        idx++;
    }
}

export const guardObjectMethod = guardMethod.bind(null, true);
export const guardComponentMethod = guardMethod.bind(null, false);

export function strictGuardObject(controller: WLETraceController, obj: TracedObject3D) {
    guardObject(controller, obj, true);
}

export function softGuardObject(controller: WLETraceController, obj: TracedObject3D) {
    guardObject(controller, obj, false);
}