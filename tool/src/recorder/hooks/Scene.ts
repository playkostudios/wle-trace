import { Scene } from '@wonderlandengine/api';
import { fetchWithProgress } from '@wonderlandengine/api/utils/fetch.js';
import { isString } from '@wonderlandengine/api/utils/object.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { type Node, parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';
import type { ReturnStatement, FunctionExpression, BlockStatement, SimpleLiteral, ExpressionStatement, Statement, Expression, IfStatement } from 'estree';

const asyncStartRegex = /^\s*(async)?\s*/;
const functionStartRegex = /^\s*(async)?\s*function[\s(*]/;

function parseFunction(func: Function): FunctionExpression {
    let inCode = func.toString();

    // if code is a method instead of a function, which is invalid code on its
    // if it's from a method definition inside of a class instead of a
    // prototype function definition, then turn it into a function expression
    if (!functionStartRegex.test(inCode)) {
        const match = asyncStartRegex.exec(inCode);
        if (match !== null) {
            // async method
            inCode = `${match[0]}function ${inCode.substring(match.index + match[0].length)}`;
        } else {
            // non-async method
            inCode = `function ${inCode}`;
        }
    }

    // parse
    const result = parseExpressionAt(inCode, 0, { ecmaVersion: 'latest', ranges: false });

    if (result.type !== 'FunctionExpression') {
        throw new Error('Method parsed into an AST node that is not a FunctionExpression');
    }

    const ast = result as unknown as FunctionExpression;

    // make sure everything after the parsed expression is whitespaces
    const codeEnd = inCode.length;
    for (let i = result.end; i < codeEnd; i++) {
        if (!/\s/g.test(inCode[i])) {
            throw new Error('Junk after function expression');
        }
    }

    return ast;
}

function generateFunction<Params extends readonly unknown[], Ret>(ast: FunctionExpression, extraContext?: Record<string, unknown>) {
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
    const retFuncAST: ReturnStatement = {
        type: 'ReturnStatement',
        argument: ast,
    };

    const genCode = generate(retFuncAST);
    const funcFactory = new Function(...extraContextParams, genCode) as (...contextArgs: unknown[]) => ((...args: Params) => Ret);
    return funcFactory(...extraContextArgs);
}

function makeParamlessFuncCall(name: string): ExpressionStatement {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'CallExpression',
            callee: {
                type: 'Identifier',
                name,
            },
            arguments: [],
            optional: false,
        },
    };
}

function makeSimpleLiteralAssignmentStatement(name: string, value: SimpleLiteral['value']): ExpressionStatement {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
                type: 'Identifier',
                name,
            },
            right: {
                type: 'Literal',
                value,
            },
        },
    };
}

let tmpCount = 0;
function makeTemp() {
    return `__wleTrace_tmp${tmpCount++}`;
}

function _maybeExplodeIntoSyncExpression(expression: Expression, extraStatementsBefore: Array<Statement>): boolean {

}

function _maybeExplodeIntoSyncIfStatement(stmt: IfStatement, stateName: string, startFuncName: string, endFuncName: string, extraStatementsBefore: Array<Statement>): boolean {
    let hadExtraVariables = false;
    if (_maybeExplodeIntoSyncExpression(stmt.test, extraStatementsBefore)) {
        hadExtraVariables = true;
    }

    // turn consequent into block if not already one
    let consBlock: BlockStatement;
    if (stmt.consequent.type === 'BlockStatement') {
        consBlock = stmt.consequent;
    } else {
        consBlock = {
            type: 'BlockStatement',
            body: [stmt.consequent],
        };
        stmt.consequent = consBlock;
    }

    // handle consequent body
    _hookIntoSyncBodyParts(consBlock.body, stateName, startFuncName, endFuncName);

    // handle else or else if
    if (stmt.alternate) {
        if (stmt.alternate.type === 'IfStatement') {
            // else-if statement. normalize into this format:
            // if (test1) {
            //     // body
            // } else {
            //     if (test2) {
            //         // body
            //     }
            // }
        } else {
            // else statement. normalize into block statement
            let altBlock: BlockStatement;
            if (stmt.alternate.type === 'BlockStatement') {
                altBlock = stmt.alternate;
            } else {
                altBlock = {
                    type: 'BlockStatement',
                    body: [stmt.alternate],
                };
                stmt.alternate = altBlock;
            }
        }

        // alternate is now guarenteed
    }

    return hadExtraVariables;
}

function _hookIntoSyncBodyParts(body: Array<Statement>, stateName: string, startFuncName: string, endFuncName: string): boolean {
    let iMax = body.length;
    let hadExtraVariables = false;
    for (let i = 0; i < iMax; i++) {
        const stmt = body[i];
        const extraStatementsBefore = new Array<Statement>();

        switch (stmt.type) {
            case 'ExpressionStatement':
                if (_maybeExplodeIntoSyncExpression(stmt.expression, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
                break;
            case 'BlockStatement':
                _hookIntoSyncBodyParts(stmt.body, stateName, startFuncName, endFuncName);
                break;
            case 'ReturnStatement':
                if (stmt.argument) {
                    if (_maybeExplodeIntoSyncExpression(stmt.argument, extraStatementsBefore)) {
                        hadExtraVariables = true;
                    }
                }
                break;
            case 'IfStatement':
                // TODO handle else too, handle block-less if statements, etc...
                break;
            case 'SwitchStatement':
                if (_maybeExplodeIntoSyncExpression(stmt.discriminant, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }

                for (const switchCase of stmt.cases) {
                    if (switchCase.test) {
                        if (_maybeExplodeIntoSyncExpression(switchCase.test, extraStatementsBefore)) {
                            hadExtraVariables = true;
                        }
                    }

                    if (_hookIntoSyncBodyParts(switchCase.consequent, stateName, startFuncName, endFuncName)) {
                        // extra variables added, need to turn this into a block
                        // statement, as you can't declare new variables in a
                        // switch case without an explicit block
                        switchCase.consequent = [
                            {
                                type: 'BlockStatement',
                                body: switchCase.consequent,
                            },
                        ];
                    }
                }
                break;
            case 'ThrowStatement':
                // TODO
                break;
            case 'TryStatement':
                // TODO
                break;
            case 'WhileStatement':
                // TODO
                break;
            case 'DoWhileStatement':
                // TODO
                break;
            case 'ForStatement':
                // TODO
                break;
            case 'ForInStatement':
                // TODO
                break;
            case 'ForOfStatement':
                // TODO
                break;
            case 'VariableDeclaration':
                // TODO
                break;
            case 'FunctionDeclaration':
            case 'ClassDeclaration': // XXX technically this might be unsafe if there is a static variable with await, but that's a super rare edge-case
            case 'EmptyStatement':
            case 'DebuggerStatement':
            case 'BreakStatement':
            case 'ContinueStatement':
                // XXX safe, do nothing
                break;
            case 'StaticBlock':
            case 'LabeledStatement':
            case 'WithStatement': // XXX with is unexpected just because it's bad, even though it would be valid here
                throw new Error(`Unexpected statement type: "${stmt.type}"`);
        }

        const extraCount = extraStatementsBefore.length;
        if (extraCount > 0) {
            body.splice(i, 0, ...extraStatementsBefore);
            i += extraCount;
            iMax += extraCount;
        }
    }

    return hadExtraVariables;
}

/**
 * Equivalent to:
 * ```js
 * let __wleTrace_tmp0 = false;
 * try {
 *     startHook();
 *     __wleTrace_tmp0 = true;
 *     // XXX sync part of input block goes here
 *     endHook();
 *     __wleTrace_tmp0 = false;
 *     // XXX async part of input block goes here
 *     startHook();
 *     __wleTrace_tmp0 = true;
 *     // XXX sync part of input block goes here
 *     endHook();
 *     __wleTrace_tmp0 = false;
 *     // XXX etc...
 * } finally {
 *     if (__wleTrace_hooked) {
 *         endHook();
 *     }
 * }
 * ```
 */
function hookIntoSyncBlockParts(block: BlockStatement, startFuncName: string, endFuncName: string): BlockStatement {
    const stateName = makeTemp();
    _hookIntoSyncBodyParts(block.body, stateName, startFuncName, endFuncName);

    return {
        type: 'BlockStatement',
        body: [
            {
                type: 'VariableDeclaration',
                kind: 'let',
                declarations: [
                    {
                        type: 'VariableDeclarator',
                        id: {
                            type: 'Identifier',
                            name: stateName,
                        },
                        init: {
                            type: 'Literal',
                            value: false,
                        },
                    },
                ],
            },
            {
                type: 'TryStatement',
                block,
                finalizer: {
                    type: 'BlockStatement',
                    body: [
                        {
                            type: 'IfStatement',
                            test: {
                                type: 'Identifier',
                                name: stateName,
                            },
                            consequent: {
                                type: 'BlockStatement',
                                body: [makeParamlessFuncCall(endFuncName)],
                            },
                        },
                    ],
                },
            },
        ],
    };
}

function injectSceneLoad(_recorder: WLETraceRecorder) {
    const ast = parseFunction(Scene.prototype.load);
    console.debug(ast);
    ast.body = hookIntoSyncBlockParts(ast.body, '__wleTrace_startHook', '__wleTrace_endHook');
    Scene.prototype.load = generateFunction(ast, {
        fetchWithProgress,
        __wleTrace_startHook: () => console.debug('start hook'),
        __wleTrace_endHook: () => console.debug('end hook'),
    });
    console.debug('!!!', Scene.prototype.load)
}

function injectSceneAppend(_recorder: WLETraceRecorder) {
    const ast = parseFunction(Scene.prototype.append);
    ast.body = hookIntoSyncBlockParts(ast.body, '__wleTrace_startHook', '__wleTrace_endHook');
    Scene.prototype.append = generateFunction(ast, {
        fetchWithProgress, isString,
        __wleTrace_startHook: () => console.debug('start hook'),
        __wleTrace_endHook: () => console.debug('end hook'),
    });
}

export function injectScene(recorder: WLETraceRecorder) {
    injectSceneLoad(recorder);
    injectSceneAppend(recorder);



    // injectAsyncDepthHooks(recorder, Scene.prototype, 'load');
    // injectAsyncDepthHooks(recorder, Scene.prototype, 'append');
}