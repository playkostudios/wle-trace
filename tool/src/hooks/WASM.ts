import { WASM } from '@wonderlandengine/api';
import { injectMethod } from '../inject/injectMethod.js';
import { getPropertyDescriptor } from '../inject/getPropertyDescriptor.js';
import { inSceneLoad } from '../utils/inSceneLoad.js';
import { handleScenePostReplace } from '../utils/handleScenePostReplace.js';
import { TracedComponent } from '../types/TracedComponent.js';
import { inAddComponent } from '../utils/inAddComponent.js';
import { guardReclaimComponent } from '../utils/guardReclaim.js';
import { type WLETraceController } from '../WLETraceController.js';
import { makeGlobalObjMethodTracer } from '../utils/trace.js';
import { injectRecorderHooks } from '../inject/injectRecorderHooks.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { type WLETraceReplayer } from '../WLETraceReplayer.js';
import { HookOptions } from '../inject/addHooksToMember.js';
import { type WLETraceEarlyInjector } from '../WLETraceEarlyInjector.js';

export function injectWASMEarlyHook(setTarget: WLETraceEarlyInjector, wljsInitHookOptions?: HookOptions): Promise<WASM> {
    // XXX there must be a special case for _wljs_init; this is called when the
    //     engine WASM instance is initialized. we need to hook into this so we
    //     can start handling some types of calls early on, otherwise, things
    //     like the recorder will miss calls to _malloc
    return new Promise((resolve, _reject) => {
        let firstTime = true;
        let beforeHook;
        const userBeforeHook = wljsInitHookOptions?.beforeHook;
        if (userBeforeHook) {
            beforeHook = (wasm: WASM, methodName: string, args: any[]) => {
                if (firstTime) {
                    firstTime = false;
                    setTarget.wasm = wasm;
                    resolve(wasm);
                }

                userBeforeHook(wasm, methodName, args);
            };
        } else {
            beforeHook = (wasm: WASM, _methodName: string, _args: any[]) => {
                if (firstTime) {
                    firstTime = false;
                    setTarget.wasm = wasm;
                    resolve(wasm);
                }
            };
        }

        injectMethod(WASM.prototype, '_wljs_init', {
            ...wljsInitHookOptions,
            beforeHook,
        });
    });
}

export function injectWASMRecorder(recorder: WLETraceRecorder) {
    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        // we only care about preloaded WASM->JS methods
        if (name !== '_wljs_init' && name.startsWith('_wljs_')) {
            injectRecorderHooks(recorder, WASM.prototype, name);
        }
    }

    return injectWASMEarlyHook(recorder);
}

export function injectWASMReplayer(replayer: WLETraceReplayer) {
    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        if (name === '_wljs_init' || !name.startsWith('_wljs_')) {
            continue;
        }

        const descriptor = getPropertyDescriptor(WASM.prototype, name);
        if (descriptor.value && (typeof descriptor.value) === 'function') {
            injectMethod(WASM.prototype, name, {
                replaceHook: function (this: WASM, ...args: any[]) {
                    return replayer.markCallbackAsReplayed(name, args);
                },
            });
        }
    }

    return injectWASMEarlyHook(replayer, {
        replaceHook: function (this: WASM, ..._args: any[]) {
            return; // do nothing. this avoid an extra allocation on init
        }
    });
}

export function injectWASM(controller: WLETraceController) {
    const wasmMethodTracer = makeGlobalObjMethodTracer(controller, 'WASM');

    // try to detect when a scene.load is actually done (between create and init)
    injectMethod(WASM.prototype, '_wljs_component_init', {
        beforeHook: (wasm: WASM, _methodName: string, _args: any[]) => {
            const hadInitEngine = inSceneLoad.get(wasm);
            if (hadInitEngine) {
                if (hadInitEngine[0] === false) {
                    const engine = hadInitEngine[1];
                    inSceneLoad.set(wasm, [true, engine])
                    handleScenePostReplace(controller, engine, 'Scene.load');
                }
            }
        },
        traceHook: controller.guardFunction('trace:WASM._wljs_component_init', wasmMethodTracer),
    });

    // try to detect when a object.addComponent is actually done (reclaim before
    // init is called)
    injectMethod(WASM.prototype, '_wljs_component_create', {
        afterHook: (wasm: WASM, _methodName: string, _args: any[], comp: TracedComponent) => {
            const hadInitEngine = inSceneLoad.get(wasm);
            if (hadInitEngine && hadInitEngine[0] === false) {
                return;
            }

            inAddComponent.delete(comp.engine);
            guardReclaimComponent(controller, comp);
        },
        traceHook: controller.guardFunction('trace:WASM._wljs_component_create', wasmMethodTracer),
    });

    // auto-inject trivial internal WASM calls
    // XXX this won't inject any of the _wl_* methods... because they aren't loaded
    //     yet. that is done on engine _init (check WonderlandEngine.ts)
    const PROPERTY_DENY_LIST = new Set([ 'constructor', '_wljs_component_init', '_wljs_component_create' ]);

    for (const name of Object.getOwnPropertyNames(WASM.prototype)) {
        if (PROPERTY_DENY_LIST.has(name)) {
            continue;
        }

        const descriptor = getPropertyDescriptor(WASM.prototype, name);
        if (descriptor.value && (typeof descriptor.value) === 'function') {
            injectMethod(WASM.prototype, name, {
                traceHook: controller.guardFunction(`trace:WASM.${name}`, wasmMethodTracer),
            });
        }
    }
}