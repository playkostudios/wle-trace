import { type Statement, type Program, type FunctionExpression } from 'estree';
import { generate } from 'escodegen';

export function patchStage1Injector(program: Program, _injectionID: number): string {
    // 1. look for `instantiateWonderlandRuntime = ...`, and get RHS's body
    //    (RHS is a function)
    // 2. track all top-level assignments and declarations in body, look for
    //    `WebAssembly.instantiate` call and get the then handler
    // 3. insert stage 2 injector call before `WebAssembly.instantiate` call
    // 4. find `ready` call and insert stage 3 injector call at the start

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
    let wasmInstantiateReady: FunctionExpression | null = null;
    let wasmInstantiateIdx = -1;
    for (let i = 0; i < funcBody.length; i++) {
        const stmt = funcBody[i];
        switch (stmt.type) {
            case 'FunctionDeclaration':
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
                // TODO
                break;
        }
    }

    if (!wasmInstantiateReady) {
        throw new Error('WebAssembly.instantiate then handler not found');
    }

    // step 3:
    // TODO

    // step 4:
    // TODO

    // done, generate code from modified ast
    return generate(program);
}