import { curryFunction } from './curryFunction.js';

function handleHookError(err: Error) {
    console.error('[wle-trace] unhandled exception in hook of injected method:', err);
}

export enum ReturnMode {
    Pass,
    PassOrReplace,
    None,
};

export interface BaseHookOptions {
    traceHook?: Function;
    beforeHook?: Function;
    afterHook?: Function;
    exceptionHook?: Function;
    safeHooks?: boolean;
}

export interface HookOptions extends BaseHookOptions {
    returnMode?: ReturnMode;
}

export function addHooksToMember(func: Function, memberName: string, options: HookOptions) {
    // parse options
    const traceHook = options.traceHook;
    const beforeHook = options.beforeHook;
    const afterHook = options.afterHook;
    const exceptionHook = options.exceptionHook;
    const returnMode = options.returnMode ?? ReturnMode.Pass;
    // TODO replace this with false once tool is stable enough
    const safeHooks = options.safeHooks ?? true;

    if (!(traceHook || beforeHook || afterHook)) {
        console.warn('This member was injected with no hooks. Either stop injecting it or add hooks');
        return func;
    }

    // XXX don't decide whether a hook needs to be called inside the member
    //     override, as that's slower. instead, do a variant for each
    //     combination of extra callbacks. do this by procedurally generating
    //     the code for the wrapper

    // -- decide argument list for wrapper curry --
    let newBody = [];
    const extraParams = ['f'];
    const extraArgs = [func];

    if (safeHooks) {
        extraParams.push('sh');
        extraArgs.push(handleHookError);
    }
    if (beforeHook) {
        extraParams.push('bh');
        extraArgs.push(beforeHook);
    }
    if (traceHook) {
        extraParams.push('th');
        extraArgs.push(traceHook);
    }
    if (exceptionHook) {
        extraParams.push('eh');
        extraArgs.push(exceptionHook);
    }
    if (afterHook) {
        extraParams.push('ah');
        extraArgs.push(afterHook);
    }

    // -- add hooks --
    // before and trace hooks (done in same block so exception handler can be
    // optionally added)
    if (traceHook || beforeHook) {
        if (safeHooks) {
            newBody.push('try{');
        }

        if (beforeHook) {
            newBody.push(`bh(this,'${memberName}',a);`);
        }
        if (traceHook) {
            newBody.push(`th(this,'${memberName}',a);`);
        }

        if (safeHooks) {
            newBody.push('}catch(e){sh(e)}');
        }
    }

    // original function (may be wrapped with exception hook)
    if (returnMode !== ReturnMode.None) {
        newBody.push('let r;');
    }

    if (exceptionHook) {
        newBody.push('try{');
    }

    if (returnMode !== ReturnMode.None) {
        newBody.push('r=');
    }

    newBody.push('f.apply(this,a);');

    if (exceptionHook) {
        newBody.push('}catch(e){');

        if (safeHooks) {
            newBody.push('try{');
        }

        newBody.push(`eh(this,'${memberName}',a,e);`);

        if (safeHooks) {
            newBody.push('}catch(e2){sh(e2)}');
        }

        newBody.push('throw e}');
    }

    // after hook (may have optional exception handler)
    if (afterHook) {
        if (safeHooks) {
            newBody.push('try{');
        }

        if (returnMode === ReturnMode.PassOrReplace) {
            newBody.push('r=');
        }

        newBody.push(`ah(this,'${memberName}',a,r);`);

        if (safeHooks) {
            newBody.push('}catch(e){sh(e)}');
        }
    }

    // decide whether to return or not
    if (returnMode !== ReturnMode.None) {
        newBody.push('return r')
    }

    // -- apply currying to wrapper --
    // (can't use bind otherwise the context changes)
    return curryFunction(new Function(...extraParams, '...a', newBody.join('')), extraArgs);
}