import { MeshComponent } from '@wonderlandengine/api';
import { strictGuardComponent } from './guardComponent.js';
import { traceComponentProperty, traceComponentSet } from './trace.js';
import { injectAccessor } from './inject.js';
import { guardComponentSetter } from './guardSetter.js';

injectAccessor(MeshComponent.prototype, 'material', traceComponentProperty, traceComponentSet, strictGuardComponent, guardComponentSetter, 'trace:get:MeshComponent.material', 'trace:set:MeshComponent.material');
