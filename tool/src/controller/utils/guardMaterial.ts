import { ERR, StyledMessage, WARN } from '../StyledMessage.js';
import { type WLETraceController } from '../WLETraceController.js';
import { triggerGuardBreakpoint } from './triggerGuardBreakpoint.js';
import { type Material } from '@wonderlandengine/api';
import { trackedMaterials } from './trackedMaterials.js';

export function guardMaterial(controller: WLETraceController, material: Material, strict: boolean, originFactory: ((mesh: Material) => StyledMessage) | null = null) {
    if (!controller.isEnabled('guard:Material')) {
        return;
    }

    if (material._index < 0 || !trackedMaterials.has(material.engine, material._index)) {
        let message = StyledMessage.fromMaterial(controller, material);
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

        triggerGuardBreakpoint(controller, true);
    }
}

export function strictGuardMaterial(controller: WLETraceController, material: Material) {
    guardMaterial(controller, material, true);
}

export function softGuardMaterial(controller: WLETraceController, material: Material) {
    guardMaterial(controller, material, false);
}