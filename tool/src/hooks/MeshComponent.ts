import { MeshComponent } from '@wonderlandengine/api';
import { injectAccessor } from '../inject/injectAccessor.js';
import { strictGuardComponent } from '../utils/guardComponent.js';
import { guardComponentSetter } from '../utils/guardSetter.js';
import { traceComponentProperty, traceComponentSet } from '../utils/trace.js';
import { controller } from '../WLETraceController.js';

injectAccessor(MeshComponent.prototype, 'material', {
    traceHook: controller.guardFunction('trace:get:MeshComponent.material', traceComponentProperty),
    beforeHook: strictGuardComponent,
}, {
    traceHook: controller.guardFunction('trace:set:MeshComponent.material', traceComponentSet),
    beforeHook: guardComponentSetter,
});