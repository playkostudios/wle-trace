import { Material } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { makeGlobalObjMethodTracer, traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { strictGuardMaterial } from '../utils/guardMaterial.js';

injectMethod(Material, 'wrap', {
    traceHook: controller.guardFunction('trace:Material.wrap', makeGlobalObjMethodTracer('Material')),
});

// auto-inject trivial Material properties
// XXX not even sure if we should be guarding material accessors/methods, since
//     you will only ever use an invalid material index if you do something
//     extremely stupid like changing the index (since materials can't be
//     destroyed)
const PROPERTY_DENY_LIST = new Set([ 'constructor', 'engine' ]);

for (const name of Object.getOwnPropertyNames(Material.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(Material.prototype, name);
    if (descriptor.get || descriptor.set) {
        let getterOptions = null;
        if (descriptor.get) {
            getterOptions = {
                traceHook: controller.guardFunction(`trace:get:Material.${name}`, traceValueProperty),
                beforeHook: strictGuardMaterial,
            };
        }

        let setterOptions = null;
        if (descriptor.set) {
            setterOptions = {
                traceHook: controller.guardFunction(`trace:set:Material.${name}`, traceValueSet),
                beforeHook: strictGuardMaterial,
            };
        }

        injectAccessor(Material.prototype, name, getterOptions, setterOptions);
    } else {
        injectMethod(Material.prototype, name, {
            traceHook: controller.guardFunction(`trace:Material.${name}`, traceValueMethod),
            beforeHook: strictGuardMaterial,
        });
    }
}