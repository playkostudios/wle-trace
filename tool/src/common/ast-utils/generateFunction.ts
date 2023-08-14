import { generate } from 'escodegen';
import { type FunctionExpression } from 'estree';
import { mkReturnStatement } from './factory/mkReturnStatement.js';

export function generateFunction<Params extends readonly unknown[], Ret>(ast: FunctionExpression, extraContext?: Record<string, unknown>) {
    // build extra context
    const extraContextParams = new Array<string>();
    const extraContextArgs = new Array<unknown>();

    if (extraContext) {
        for (const name of Object.getOwnPropertyNames(extraContext)) {
            extraContextParams.push(name);
            extraContextArgs.push(extraContext[name]);
        }
    }

    // make function
    // XXX for some reason you can't get the AsyncFunction constructor anymore
    // by doing "async function(){}.constructor", so instead we make a new
    // regular function that returns the new async function, and we call it once
    // to get the async function
    const genCode = generate(mkReturnStatement(ast));
    const funcFactory = new Function(...extraContextParams, genCode) as (...contextArgs: unknown[]) => ((...args: Params) => Ret);
    return funcFactory(...extraContextArgs);
}