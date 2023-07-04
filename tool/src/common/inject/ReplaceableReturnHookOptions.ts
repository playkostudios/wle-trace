import { ReturnMode, type BaseHookOptions, type HookOptions } from './addHooksToMember.js';

export interface ReplaceableReturnHookOptions extends BaseHookOptions {
    afterHookReplacesReturn?: boolean;
}

export function finalizeReplaceableReturnHookOptions(): null;
export function finalizeReplaceableReturnHookOptions(options: undefined | null): null;
export function finalizeReplaceableReturnHookOptions(options: ReplaceableReturnHookOptions): HookOptions;
export function finalizeReplaceableReturnHookOptions(options?: ReplaceableReturnHookOptions | null): HookOptions | null;
export function finalizeReplaceableReturnHookOptions(options?: ReplaceableReturnHookOptions | null): HookOptions | null {
    if (!options) {
        return null;
    }

    let newOptions: HookOptions;
    if (options.afterHookReplacesReturn) {
        newOptions = {
            ...options,
            returnMode: ReturnMode.PassOrReplace,
        };
    } else {
        newOptions = options;
    }

    return newOptions;
}