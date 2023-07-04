import { MeshComponent } from '@wonderlandengine/api';
import { injectAccessor } from '../../common/inject/injectAccessor.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetterIAC } from '../utils/guardSetter.js';
import { traceComponentProperty, traceComponentSetIAC } from '../utils/trace.js';
import { type WLETraceController } from '../WLETraceController.js';

export function injectMeshComponent(controller: WLETraceController) {
    const boundTraceComponentProperty = controller.bindFunc(traceComponentProperty);
    const boundTraceComponentSetIAC = controller.bindFunc(traceComponentSetIAC);
    const boundStrictGuardComponent = controller.bindFunc(strictGuardComponent);
    const boundGuardComponentSetterIAC = controller.bindFunc(guardComponentSetterIAC);

    injectAccessor(MeshComponent.prototype, 'material', {
        traceHook: controller.guardFunction('trace:get:MeshComponent.material', boundTraceComponentProperty),
        beforeHook: boundStrictGuardComponent,
    }, {
        traceHook: controller.guardFunction('trace:set:MeshComponent.material', boundTraceComponentSetIAC),
        beforeHook: boundGuardComponentSetterIAC,
    });

    injectAccessor(MeshComponent.prototype, 'mesh', {
        traceHook: controller.guardFunction('trace:get:MeshComponent.mesh', boundTraceComponentProperty),
        beforeHook: boundStrictGuardComponent,
    }, {
        traceHook: controller.guardFunction('trace:set:MeshComponent.mesh', boundTraceComponentSetIAC),
        beforeHook: boundGuardComponentSetterIAC,
    });

    injectAccessor(MeshComponent.prototype, 'skin', {
        traceHook: controller.guardFunction('trace:get:MeshComponent.skin', boundTraceComponentProperty),
        beforeHook: boundStrictGuardComponent,
    }, {
        traceHook: controller.guardFunction('trace:set:MeshComponent.skin', boundTraceComponentSetIAC),
        beforeHook: boundGuardComponentSetterIAC,
    });
}