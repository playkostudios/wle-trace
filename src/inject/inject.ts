import { controller } from './WLETraceController.js';

function handleHookError(err) {
    console.error('[wle-trace] unhandled exception in hook of injected method:', err);
}

function curryFunction(func, extraArgs) {
    return function (...args) {
        return func.call(this, ...extraArgs, ...args);
    }
}

function addHooksToMethod(method, methodName, traceHook, beforeHook, afterHook, afterCallbackReplacesReturn, safeHooks = true) {
    if (!(traceHook || beforeHook || afterHook)) {
        console.warn('This method was injected with no hooks. Either stop injecting it or add hooks');
        return method;
    }

    // XXX don't decide whether a hook needs to be called inside the method
    //     override, as that's slower. instead, do a variant for each
    //     combination of extra callbacks
    let newBody = [];
    const extraParams = ['m'];
    const extraArgs = [method];

    if (safeHooks) {
        extraParams.push('eh');
        extraArgs.push(handleHookError);
    }

    if (traceHook || beforeHook) {
        if (safeHooks) {
            newBody.push('try{');
        }

        if (beforeHook) {
            newBody.push(`bh(this,'${methodName}',a);`);
            extraParams.push('bh');
            extraArgs.push(beforeHook);
        }
        if (traceHook) {
            newBody.push(`th(this,'${methodName}',a)`);
            extraParams.push('th');
            extraArgs.push(traceHook);
        }

        if (safeHooks) {
            newBody.push('}catch(e){eh(e)}');
        }
    }

    if (afterHook) {
        newBody.push('let r=m.apply(this,a);')

        if (safeHooks) {
            newBody.push('try{');
        }

        if (afterCallbackReplacesReturn) {
            newBody.push('r=');
        }

        newBody.push(`ah(this,'${methodName}',a,r)`);

        if (safeHooks) {
            newBody.push('}catch(e){eh(e)}');
        }

        newBody.push(';return r')
        extraParams.push('ah');
        extraArgs.push(afterHook);
    } else {
        newBody.push('return m.apply(this,a)');
    }

    // apply currying to function (can't use bind otherwise the context changes)
    return curryFunction(new Function(...extraParams, '...a', newBody.join('')), extraArgs);
}

export function injectMethod(prototype, methodName, traceCallback = null, beforeCallback = null, afterCallback = null, featureID = null, afterCallbackReplacesReturn = false) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    if (!descriptor) {
        console.error(`Missing descriptor for method ${methodName}`);
        return;
    }

    if (traceCallback && featureID !== null && featureID !== undefined) {
        controller.registerFeature(featureID);

        const traceCallbackOrig = traceCallback;
        traceCallback = function(self, methodName, args) {
            if (controller.isEnabled(featureID)) {
                traceCallbackOrig(self, methodName, args);
            }
        };
    }

    Object.defineProperty(prototype, methodName, {
        ...descriptor,
        value: addHooksToMethod(descriptor.value, methodName, traceCallback, beforeCallback, afterCallback, afterCallbackReplacesReturn)
    });
}

export function injectAccessor(prototype, accessorName, getCallback = null, setCallback = null, beforeGetCallback = null, beforeSetCallback = null, getFeatureID = null, setFeatureID = null) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, accessorName);
    if (!descriptor) {
        console.error(`Missing descriptor for accessor ${accessorName}`);
        return;
    }

    if (getCallback && getFeatureID !== null && getFeatureID !== undefined) {
        controller.registerFeature(getFeatureID);

        const getCallbackOrig = getCallback;
        getCallback = function(self, accessorName) {
            if (controller.isEnabled(getFeatureID)) {
                getCallbackOrig(self, accessorName);
            }
        };
    }

    if (setCallback && setFeatureID !== null && setFeatureID !== undefined) {
        controller.registerFeature(setFeatureID);

        const setCallbackOrig = setCallback;
        setCallback = function(self, accessorName, value) {
            if (controller.isEnabled(setFeatureID)) {
                setCallbackOrig(self, accessorName, value);
            }
        };
    }

    const getOrig = descriptor.get;
    const setOrig = descriptor.set;
    let newGet, newSet;

    // XXX don't decide whether beforeXYZCallback needs to be called inside the
    //     accessor override, as that's slower
    if (getOrig) {
        if (beforeGetCallback) {
            newGet = function() {
                beforeGetCallback(this, accessorName);
                getCallback(this, accessorName);
                return getOrig.apply(this);
            };
        } else {
            newGet = function() {
                getCallback(this, accessorName);
                return getOrig.apply(this);
            };
        }
    }

    if (setOrig) {
        if (beforeSetCallback) {
            newSet = function(value) {
                beforeSetCallback(this, accessorName, value);
                setCallback(this, accessorName, value);
                return setOrig.apply(this, [value]);
            };
        } else {
            newSet = function(value) {
                setCallback(this, accessorName, value);
                return setOrig.apply(this, [value]);
            };
        }
    }

    Object.defineProperty(prototype, accessorName, { get: newGet, set: newSet });
}