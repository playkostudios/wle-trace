import { MeshComponent } from '@wonderlandengine/api';
import { injectAccessor } from '../inject/injectAccessor.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetterIAC } from '../utils/guardSetter.js';
import { traceComponentProperty, traceComponentSetIAC } from '../utils/trace.js';
import { controller } from '../WLETraceController.js';

injectAccessor(MeshComponent.prototype, 'material', {
    traceHook: controller.guardFunction('trace:get:MeshComponent.material', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:MeshComponent.material', traceComponentSetIAC),
    beforeHook: guardComponentSetterIAC,
});

injectAccessor(MeshComponent.prototype, 'mesh', {
    traceHook: controller.guardFunction('trace:get:MeshComponent.mesh', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:MeshComponent.mesh', traceComponentSetIAC),
    beforeHook: guardComponentSetterIAC,
});

injectAccessor(MeshComponent.prototype, 'skin', {
    traceHook: controller.guardFunction('trace:get:MeshComponent.skin', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:MeshComponent.skin', traceComponentSetIAC),
    beforeHook: guardComponentSetterIAC,
});