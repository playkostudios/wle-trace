import { Component, Object3D } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from '../StyledMessage.js';
import { type TracedObject3D } from '../types/TracedObject3D.js';
import { type TracedComponent } from '../types/TracedComponent.js';

controller.registerFeature('guard:setters');

function originFactory(isObject: boolean, objOrComp: TracedObject3D | TracedComponent, setterName: string) {
    const factoryName = isObject ? 'fromObject3D' : 'fromComponent';
    return StyledMessage[factoryName](objOrComp).add(`::${setterName} = `);
}

export function guardSetter(isObject: boolean, objOrComp: TracedObject3D | TracedComponent, setterName: string, value: any, strict: boolean) {
    if (!controller.isEnabled('guard:setters')) {
        return;
    }

    if (typeof value === 'object') {
        if (value instanceof Object3D) {
            guardObject(value as unknown as TracedObject3D, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Component) {
            guardComponent(value as unknown as TracedComponent, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        }
    }
}

export const guardObjectSetter = guardSetter.bind(null, true);
export const guardComponentSetter = guardSetter.bind(null, false);
