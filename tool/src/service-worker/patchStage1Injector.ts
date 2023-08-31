import { type Statement, type Program, type FunctionExpression, MemberExpression, CallExpression } from 'estree';
import { generate } from 'escodegen';
import { isWasmInstantiateCall } from './isWasmInstantiateCall.js';
import { makeStage2Or3InjectorCall } from './makeStage2Or3InjectorCall.js';

export function patchStage1Injector(program: Program, injectionID: number): string {
    // 1. look for `instantiateWonderlandRuntime = ...`, and get RHS's body
    //    (RHS is a function)
    // 2. track all top-level assignments and declarations in body, look for
    //    `WebAssembly.instantiate` call and get the then handler
    // 3. insert stage 2 injector call before `WebAssembly.instantiate` call,
    //    and stage 3 injector call at top of then handler

    // step 1:
    let funcBody: Array<Statement> | null = null;
    for (const node of program.body) {
        if (node.type === 'VariableDeclaration') {
            for (const decl of node.declarations) {
                if (decl.init && decl.init.type === 'FunctionExpression') {
                    funcBody = decl.init.body.body;
                    break;
                }
            }

            if (funcBody) {
                break;
            }
        } else if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' && node.expression.right.type === 'FunctionExpression') {
            funcBody = node.expression.right.body.body;
            break;
        }
    }

    if (!funcBody) {
        throw new Error('Could not find assignment to function expression');
    }

    // step 2:
    const passedNames = new Set<string>();
    let wasmInstantiate: [thenFunc: FunctionExpression, idx: number, importsArgName: string, instanceArgName: string] | null = null;
    for (let i = 0; i < funcBody.length; i++) {
        const stmt = funcBody[i];
        switch (stmt.type) {
            case 'FunctionDeclaration':
                if (stmt.id) {
                    passedNames.add(stmt.id.name);
                }
                break;
            case 'VariableDeclaration':
                for (const decl of stmt.declarations) {
                    const id = decl.id;
                    if (id.type === 'Identifier') {
                        passedNames.add(id.name);
                    }
                }
                break;
            case 'ExpressionStatement':
                if (stmt.expression.type === 'CallExpression') {
                    const callExpr = stmt.expression;
                    if (isWasmInstantiateCall(callExpr)) {
                        if (wasmInstantiate) {
                            throw new Error('Multiple WebAssembly.instantiate calls found');
                        }

                        const instantiateArgs = ((callExpr.callee as MemberExpression).object as CallExpression).arguments;
                        if (instantiateArgs.length < 2) {
                            throw new Error('WebAssembly.instantiate call has an unexpected number of arguments');
                        }

                        if (instantiateArgs[1].type !== 'Identifier') {
                            throw new Error("WebAssembly.instantiate call's second argument is not an identifier");
                        }

                        const importsArgName = instantiateArgs[1].name;
                        const callArgs = callExpr.arguments;
                        if (callArgs.length > 0) {
                            const thenArg = callArgs[0];
                            if (thenArg.type === 'FunctionExpression') {
                                const thenArgParams = thenArg.params;
                                if (thenArgParams.length > 0) {
                                    const thenArgParam0 = thenArgParams[0];
                                    if (thenArgParam0.type !== 'Identifier') {
                                        throw new Error("WebAssembly.instantiate call handler's first argument is not an identifier");
                                    }

                                    wasmInstantiate = [thenArg, i, importsArgName, thenArgParam0.name];
                                } else {
                                    throw new Error('WebAssembly.instantiate call handler does not pass an argument with the WASM instance');
                                }
                            } else {
                                throw new Error('WebAssembly.instantiate call handler is not a function expression');
                            }
                        } else {
                            throw new Error('WebAssembly.instantiate call has no handler');
                        }
                    }
                }
                break;
        }
    }

    if (!wasmInstantiate) {
        throw new Error('WebAssembly.instantiate then handler not found');
    }

    // step 3:
    funcBody.splice(wasmInstantiate[1], 0, makeStage2Or3InjectorCall(false, wasmInstantiate[2], injectionID, passedNames));
    wasmInstantiate[0].body.body.splice(0, 0, makeStage2Or3InjectorCall(true, wasmInstantiate[3], injectionID, passedNames));

    // done, generate code from modified ast
    return generate(program);
}