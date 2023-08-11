import { Scene } from '@wonderlandengine/api';
import { fetchWithProgress } from '@wonderlandengine/api/utils/fetch.js';
import { isString } from '@wonderlandengine/api/utils/object.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';
import type { ReturnStatement, FunctionExpression, BlockStatement, SimpleLiteral, ExpressionStatement, Statement, Expression, IfStatement, VariableDeclaration, BaseNode, Pattern } from 'estree';

function _hookIntoSyncBodyParts(body: Array<Statement>, stateName: string, startFuncName: string, endFuncName: string): boolean {
    let iMax = body.length;
    let hadExtraVariables = false;
    for (let i = 0; i < iMax; i++) {
        const stmt = body[i];
        if (!statementHasAwait(stmt)) {
            continue;
        }

        const extraStatementsBefore = new Array<Statement>();
        const subBlocks = new Array<BlockStatement>();

        switch (stmt.type) {
            case 'ExpressionStatement':
                if (_maybeExplodeIntoSyncExpression(stmt.expression, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
                break;
            case 'BlockStatement':
                subBlocks.push(stmt);
                break;
            case 'ReturnStatement':
                if (stmt.argument) {
                    if (_maybeExplodeIntoSyncExpression(stmt.argument, extraStatementsBefore)) {
                        hadExtraVariables = true;
                    }
                }
                break;
            case 'IfStatement':
                // explode condition if it has an await
                if (expressionHasAwait(stmt.test)) {
                    explodeExpressionUntilAwait(stmt.test);
                }
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
                if (_maybeExplodeIntoSyncExpression(stmt.argument, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
                break;
            case 'TryStatement':
                _hookIntoSyncBodyParts(stmt.block.body, stateName, startFuncName, endFuncName);
                break;
            case 'WhileStatement':
            case 'DoWhileStatement':
            case 'ForStatement':
            case 'ForInStatement':
            case 'ForOfStatement':
                // TODO
                throw new Error('NIY');
            case 'VariableDeclaration':
                for (const decl of stmt.declarations) {
                    if (decl.init && _maybeExplodeIntoSyncExpression(decl.init, extraStatementsBefore)) {
                        hadExtraVariables = true;
                    }
                }
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

        for (const subBlock of subBlocks) {
            _hookIntoSyncBodyParts(subBlock.body, stateName, startFuncName, endFuncName);
        }

        const extraCount = extraStatementsBefore.length;
        if (extraCount > 0) {
            body.splice(
                i + 1, 0,
                makeParamlessFuncCall(startFuncName),
                makeSimpleLiteralAssignmentStatement(stateName, true),
            );
            body.splice(
                i, 0,
                ...extraStatementsBefore,
                makeParamlessFuncCall(endFuncName),
                makeSimpleLiteralAssignmentStatement(stateName, false),
            );
            i += extraCount + 4;
            iMax += extraCount + 4;
        }
    }

    return hadExtraVariables;
}

/**
 * Equivalent to:
 * ```js
 * let __wleTrace_tmp0 = false;
 * startHook();
 * __wleTrace_tmp0 = true;
 * try {
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
 *
 * TODO this is easier to implement because it's in-place, so we don't have to
 *      explode statements/expressions:
 * ```js
 * let __wleTrace_tmp0 = false;
 * startHook();
 * __wleTrace_tmp0 = true;
 * try {
 *     let regular = "code";
 *     let goes = 'here';
 *     let asyncResponse = await awaitHook(actualAwaitFunc());
 *     let more = "code";
 *     let here = 'comes';
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
            makeVariableDeclaration(stateName, 'let', {
                type: 'Literal',
                value: false,
            }),
            makeParamlessFuncCall(startFuncName),
            makeSimpleLiteralAssignmentStatement(stateName, true),
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