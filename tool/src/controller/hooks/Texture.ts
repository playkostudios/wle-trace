import { Texture } from '@wonderlandengine/api';
import { type WLETraceController } from '../WLETraceController.js';
import { getPropertyDescriptor } from '../../common/inject/getPropertyDescriptor.js';
import { injectAccessor } from '../../common/inject/injectAccessor.js';
import { injectMethod } from '../../common/inject/injectMethod.js';
import { traceValueMethod, traceValueProperty, traceValueSet } from '../utils/trace.js';
import { trackedTextures } from '../utils/trackedTextures.js';
import { strictGuardTexture } from '../utils/guardTexture.js';
import { ERR, StyledMessage } from '../StyledMessage.js';
import { triggerGuardBreakpoint } from '../utils/triggerGuardBreakpoint.js';
import { triggerBreakpoint } from '../utils/triggerBreakpoint.js';
import { type TracedTexture } from '../types/TracedTexture.js';
import { getDestructionTrace } from '../utils/getDestructionTrace.js';
import { addDestructionTrace } from '../utils/addDestructionTrace.js';

export function injectTexture(controller: WLETraceController) {
    const boundStrictGuardTexture = controller.bindFunc(strictGuardTexture);
    const boundTraceValueProperty = controller.bindFunc(traceValueProperty);
    const boundTraceValueSet = controller.bindFunc(traceValueSet);
    const boundTraceValueMethod = controller.bindFunc(traceValueMethod);

    controller.registerFeature('trace:destruction:Texture');
    controller.registerFeature('debug:ghost:Texture');

    // XXX can't override constructor as that will break instanceof statements.
    //     however, we can override the internal WASM._wl_renderer_addImage method
    //     instead. this is done in the WonderlandEngine hooks

    injectMethod(Texture.prototype, 'destroy', {
        traceHook: controller.guardFunction('trace:Texture.destroy', boundTraceValueMethod),
        beforeHook: (texture: TracedTexture, _methodName: string) => {
            const engine = texture.engine;
            const texId = texture.id;
            const trackerStatus = trackedTextures.get(engine, texId);
            const texMsg = StyledMessage.fromTexture(controller, texture);

            if (texture.__wle_trace_destruction_trace !== undefined) {
                if (trackerStatus) {
                    new StyledMessage(controller)
                        .add('destroy detected in unsafely-reused Texture ')
                        .addSubMessage(texMsg)
                        .print(true, ERR);
                } else {
                    const message = new StyledMessage(controller)
                        .add('double-destroy detected in Texture ')
                        .addSubMessage(texMsg);

                    addDestructionTrace(controller, message, texture.__wle_trace_destruction_trace);

                    message.print(true, ERR);
                }
            } else {
                texture.__wle_trace_destruction_trace = getDestructionTrace(controller);

                if (trackerStatus === undefined) {
                    new StyledMessage(controller)
                        .add('destroy detected in untracked Texture ')
                        .addSubMessage(texMsg)
                        .print(true, ERR);

                    triggerGuardBreakpoint(controller, true);

                    if (controller.isEnabled('debug:ghost:Texture')) {
                        new StyledMessage(controller)
                            .add(`ghost Texture (ID ${texId}) detected in guard`)
                            .print(true, ERR);

                        debugger;
                    }
                } else if (trackerStatus) {
                    trackedTextures.set(engine, texId, false);

                    if (controller.isEnabled('trace:destruction:Texture')) {
                        new StyledMessage(controller)
                            .add('destroying Texture ')
                            .addSubMessage(texMsg)
                            .print(true);
                    }

                    triggerBreakpoint(controller, 'destruction:Texture');
                } else {
                    const message = new StyledMessage(controller)
                        .add('double-destroy detected in Texture ')
                        .addSubMessage(texMsg);

                    addDestructionTrace(controller, message, undefined);

                    message.print(true, ERR);

                    triggerGuardBreakpoint(controller, true);
                }
            }
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
                    traceHook: controller.guardFunction(`trace:get:Texture.${name}`, boundTraceValueProperty),
                    beforeHook: boundStrictGuardTexture,
                };
            }

            let setterOptions = null;
            if (descriptor.set) {
                setterOptions = {
                    traceHook: controller.guardFunction(`trace:set:Texture.${name}`, boundTraceValueSet),
                    beforeHook: boundStrictGuardTexture,
                };
            }

            injectAccessor(Texture.prototype, name, getterOptions, setterOptions);
        } else {
            injectMethod(Texture.prototype, name, {
                traceHook: controller.guardFunction(`trace:Texture.${name}`, boundTraceValueMethod),
                beforeHook: boundStrictGuardTexture,
            });
        }
    }
}