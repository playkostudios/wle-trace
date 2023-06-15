import { Texture } from '@wonderlandengine/api';
import { controller } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { injectAccessor } from '../inject/injectAccessor.js';
import { injectMethod } from '../inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { trackedTextures } from '../utils/trackedTextures.js';
import { strictGuardTexture } from '../utils/guardTexture.js';

controller.registerFeature('trace:destruction:Texture');
controller.registerFeature('destruction:Texture');

// XXX can't override constructor as that will break instanceof statements.
//     however, we can override the internal WASM._wl_mesh_create method
//     instead. this is done in the WonderlandEngine hooks

injectMethod(Texture.prototype, 'destroy', {
    traceHook: controller.guardFunction('trace:Texture.destroy', traceValueMethod),
    beforeHook: (texture: Texture, _methodName: string) => {
        trackedTextures.set(texture.engine, texture.id, false);
    }
});

// auto-inject trivial Texture properties
const PROPERTY_DENY_LIST = new Set([ 'constructor', 'destroy', 'engine', 'id' ]);

for (const name of Object.getOwnPropertyNames(Texture.prototype)) {
    if (PROPERTY_DENY_LIST.has(name)) {
        continue;
    }

    const descriptor = getPropertyDescriptor(Texture.prototype, name);
    if (descriptor.get || descriptor.set) {
        let getterOptions = null;
        if (descriptor.get) {
            getterOptions = {
                traceHook: controller.guardFunction(`trace:get:Texture.${name}`, traceValueProperty),
                beforeHook: strictGuardTexture,
            };
        }

        let setterOptions = null;
        if (descriptor.set) {
            setterOptions = {
                traceHook: controller.guardFunction(`trace:set:Texture.${name}`, traceValueSet),
                beforeHook: strictGuardTexture,
            };
        }

        injectAccessor(Texture.prototype, name, getterOptions, setterOptions);
    } else {
        injectMethod(Texture.prototype, name, {
            traceHook: controller.guardFunction(`trace:Texture.${name}`, traceValueMethod),
            beforeHook: strictGuardTexture,
        });
    }
}