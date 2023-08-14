import { type FunctionExpression } from 'estree';
import { hookIntoSyncTopBlockParts } from './hookIntoSyncTopBlockParts.js';
import { generateFunction } from '../generateFunction.js';

export function generateSyncHookedFunction<Params extends readonly unknown[], Ret>(func: FunctionExpression, startHook: () => void, endHook: () => void, extraContext?: Record<string, unknown>) {
    // hook into function body
    const [ hookedBlock, injectContext ] = hookIntoSyncTopBlockParts(func.body);
    func.body = hookedBlock;

    // add extra parameters to function
    func.params;

    // generate and curry function
    return generateFunction<Params, Ret>(func, {
        ...extraContext,
        [injectContext.startHookName]: startHook,
        [injectContext.endHookName]: endHook,
    })
}
