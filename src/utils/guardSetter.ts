import { Component, Object3D } from '@wonderlandengine/api';
import { controller } from './WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from './StyledMessage.js';

controller.registerFeature('guard:setters');

function originFactory(isObject, objOrComp, setterName) {
    const factoryName = isObject ? 'fromObject3D' : 'fromComponent';
    return StyledMessage[factoryName](objOrComp).add(`::${setterName} = `);
}

export function guardSetter(isObject, objOrComp, setterName, value, strict) {
    if (!controller.isEnabled('guard:setters')) {
        return;
    }

    if (typeof value === 'object') {
        if (value instanceof Object3D) {
            guardObject(value, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        } else if (value instanceof Component) {
            guardComponent(value, strict, originFactory.bind(null, isObject, objOrComp, setterName));
        }
    }
}

export const guardObjectSetter = guardSetter.bind(null, true);
export const guardComponentSetter = guardSetter.bind(null, false);
