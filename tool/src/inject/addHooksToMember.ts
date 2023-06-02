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
    const returnMode = options.returnMode ?? ReturnMode.Pass;
    // TODO replace this with false once tool is stable enough
    const safeHooks = options.safeHooks ?? true;

    if (!(traceHook || beforeHook || afterHook)) {
        console.warn('This member was injected with no hooks. Either stop injecting it or add hooks');
        return func;
    }

    // XXX don't decide whether a hook needs to be called inside the member
    //     override, as that's slower. instead, do a variant for each
    //     combination of extra callbacks
    let newBody = [];
    const extraParams = ['f'];
    const extraArgs = [func];

    if (safeHooks) {
        extraParams.push('eh');
        extraArgs.push(handleHookError);
    }

    if (traceHook || beforeHook) {
        if (safeHooks) {
            newBody.push('try{');
        }

        if (beforeHook) {
            newBody.push(`bh(this,'${memberName}',a);`);
            extraParams.push('bh');
            extraArgs.push(beforeHook);
        }
        if (traceHook) {
            newBody.push(`th(this,'${memberName}',a);`);
            extraParams.push('th');
            extraArgs.push(traceHook);
        }

        if (safeHooks) {
            newBody.push('}catch(e){eh(e)}');
        }
    }

    if (afterHook) {
        newBody.push('let r=f.apply(this,a);')

        if (safeHooks) {
            newBody.push('try{');
        }

        if (returnMode === ReturnMode.PassOrReplace) {
            newBody.push('r=');
        }

        newBody.push(`ah(this,'${memberName}',a,r);`);

        if (safeHooks) {
            newBody.push('}catch(e){eh(e)}');
        }

        if (returnMode !== ReturnMode.None) {
            newBody.push('return r')
        }

        extraParams.push('ah');
        extraArgs.push(afterHook);
    } else {
        if (returnMode !== ReturnMode.None) {
            newBody.push('return ')
        }

        newBody.push('f.apply(this,a)');
    }

    // apply currying to function (can't use bind otherwise the context changes)
    return curryFunction(new Function(...extraParams, '...a', newBody.join('')), extraArgs);
}