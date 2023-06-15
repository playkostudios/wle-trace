import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { controller } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Material } from '@wonderlandengine/api';
import { trackedMaterials } from './trackedMaterials.js';

controller.registerFeature('guard:Material');

export function guardMaterial(material: Material, strict: boolean, originFactory: ((mesh: Material) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Material')) {
        return;
    }

    if (material._index < 0 || !trackedMaterials.has(material.engine, material._index)) {
        let message = StyledMessage.fromMaterial(material);
        if (originFactory !== null) {
            message = originFactory(material).addSubMessage(message);
        }

        message.add(' - ');

        if (!strict) {
            message.add('possible ');
        }

        message
            .add('attempt to use invalid Material')
            .print(true, strict ? ERR : WARN);

        triggerGuardBreakpoint(true);
    }
}

export function strictGuardMaterial(material: Material) {
    guardMaterial(material, true);
}

export function softGuardMaterial(material: Material) {
    guardMaterial(material, false);
}