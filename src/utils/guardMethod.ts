import { Component, Object3D } from '@wonderlandengine/api';
import { controller } from './WLETraceController.js';
import { guardObject } from './guardObject.js';
import { guardComponent } from './guardComponent.js';
import { StyledMessage } from './StyledMessage.js';

controller.registerFeature('guard:methods');

function originFactory(isObject, objOrComp, methodName, idx) {
    const factoryName = isObject ? 'fromObject3D' : 'fromComponent';
    return StyledMessage[factoryName](objOrComp).add(`::${methodName}(...)::args[${idx}] - `);
}

function guardMethod(isObject, objOrComp, methodName, args, strict) {
    if (args.length === 0 || !controller.isEnabled('guard:methods')) {
        return;
    }

    const originFactoryBind = originFactory.bind(null, isObject, objOrComp, methodName);

    let idx = 0;
    for (const arg of args) {
        if (typeof arg === 'object') {
            if (arg instanceof Object3D) {
                guardObject(arg, strict, originFactoryBind.bind(null, idx));
            } else if (arg instanceof Component) {
                guardComponent(arg, strict, originFactoryBind.bind(null, idx));
            }
        }

        idx++;
    }
}

export const guardObjectMethod = guardMethod.bind(null, true);
export const guardComponentMethod = guardMethod.bind(null, false);
