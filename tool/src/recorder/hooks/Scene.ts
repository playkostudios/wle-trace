import { Scene } from '@wonderlandengine/api';
import { fetchWithProgress } from '@wonderlandengine/api/utils/fetch.js';
import { isString } from '@wonderlandengine/api/utils/object.js';
import { type WLETraceRecorder } from '../WLETraceRecorder.js';
import { parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';
import type { ReturnStatement, FunctionExpression, BlockStatement, SimpleLiteral, ExpressionStatement, Statement, Expression, IfStatement, VariableDeclaration, BaseNode, Pattern } from 'estree';

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

function makeVariableDeclaration(name: string, kind: VariableDeclaration['kind'], init?: Expression): VariableDeclaration {
    return {
        type: 'VariableDeclaration',
        kind,
        declarations: [
            {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name,
                },
                init,
            },
        ],
    };
}

let tmpCount = 0;
function makeTemp() {
    return `__wleTrace_tmp${tmpCount++}`;
}

function _maybeExplodeIntoSyncExpression(expr: Expression, extraStatementsBefore: Array<Statement>): boolean {
    let hadExtraVariables = false;

    switch (expr.type) {
        case 'ArrayExpression':
            for (const subExpr of expr.elements) {
                if (!subExpr) {
                    // XXX why can elements be null? is it a cheaper way to
                    //     remove elements from an array expression?
                    continue;
                }

                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (_maybeExplodeIntoSyncExpression(focus, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }
            break;
        case 'ArrowFunctionExpression':
            for (const subExpr of expr.params) {
                if (subExpr.type === 'AssignmentPattern' && _maybeExplodeIntoSyncExpression(subExpr.right, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }
            break;
        case 'AssignmentExpression':
            if (_maybeExplodeIntoSyncExpression(expr.right, extraStatementsBefore)) {
                hadExtraVariables = true;
            }
            break;
        case 'AwaitExpression': {
            // await found, need to explode argument out of expression
            const newVar = makeTemp();
            _maybeExplodeIntoSyncExpression(expr.argument, extraStatementsBefore);
            extraStatementsBefore.push(makeVariableDeclaration(newVar, 'const', expr.argument));
            expr.argument = {
                type: 'Identifier',
                name: newVar,
            };
            hadExtraVariables = true;
            break;
        }
        case 'BinaryExpression':
            if (_maybeExplodeIntoSyncExpression(expr.left, extraStatementsBefore)) {
                hadExtraVariables = true;
            }

            if (_maybeExplodeIntoSyncExpression(expr.right, extraStatementsBefore)) {
                hadExtraVariables = true;
            }
            break;
        case 'CallExpression':
        case 'NewExpression':
            if (expr.callee.type !== 'Super') {
                if (_maybeExplodeIntoSyncExpression(expr.callee, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }

            for (const subExpr of expr.arguments) {
                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (_maybeExplodeIntoSyncExpression(focus, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }
            break;
        case 'MemberExpression':
            if (expr.object.type !== 'Super') {
                if (_maybeExplodeIntoSyncExpression(expr.object, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }

            if (expr.property.type !== 'PrivateIdentifier') {
                if (_maybeExplodeIntoSyncExpression(expr.property, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }
            break;
        case 'TemplateLiteral':
            // XXX i have no idea what this is so it's probably incorrect
            for (const subExpr of expr.expressions) {
                if (_maybeExplodeIntoSyncExpression(subExpr, extraStatementsBefore)) {
                    hadExtraVariables = true;
                }
            }
            break;
        case 'Identifier':
        case 'Literal':
        case 'ThisExpression':
            // safe, do nothing
            break;
        default:
            // TODO
            throw new Error(`NIY ${expr.type}`)
    }

    return hadExtraVariables;
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
        let altBlock: BlockStatement;
        if (stmt.alternate.type === 'BlockStatement') {
            // else statement. already a block statement
            altBlock = stmt.alternate;
        } else {
            // else/else-if statement. normalize into block statement
            altBlock = {
                type: 'BlockStatement',
                body: [stmt.alternate],
            };
            stmt.alternate = altBlock;
        }

        // alternate is now guarenteed to be a block statement
        _hookIntoSyncBodyParts(altBlock.body, stateName, startFuncName, endFuncName);
    }

    return hadExtraVariables;
}

function isPattern(maybePattern: Pattern | BaseNode): maybePattern is Pattern {
    switch (maybePattern.type) {
        case 'Identifier':
        case 'ObjectPattern':
        case 'ArrayPattern':
        case 'RestElement':
        case 'AssignmentPattern':
        case 'MemberExpression':
            return true;
        default:
            return false;
    }
}

function patternHasAwait(pattern: Pattern): boolean {
    switch (pattern.type) {
        case 'Identifier':
            return false;
        case 'ObjectPattern':
            for (const prop of pattern.properties) {
                if (prop.type === 'RestElement') {
                    if (patternHasAwait(prop.argument)) {
                        return true;
                    }
                } else {
                    if (prop.key.type !== 'PrivateIdentifier' && expressionHasAwait(prop.key)) {
                        return true;
                    }

                    if (isPattern(prop.value)) {
                        if (patternHasAwait(prop.value)) {
                            return true;
                        }
                    } else if (expressionHasAwait(prop.value)) {
                        return true;
                    }
                }
            }
            break;
        case 'ArrayPattern':
            for (const subPattern of pattern.elements) {
                if (subPattern && patternHasAwait(subPattern)) {
                    return true;
                }
            }
            break;
        case 'RestElement':
            if (patternHasAwait(pattern.argument)) {
                return true;
            }
            break;
        case 'AssignmentPattern':
            if (patternHasAwait(pattern.left) || expressionHasAwait(pattern.right)) {
                return true;
            }
            break;
        case 'MemberExpression':
            if (pattern.property.type !== 'PrivateIdentifier' && expressionHasAwait(pattern.property)) {
                return true;
            }
            break;
    }

    return false;
}

function expressionHasAwait(expr: Expression): boolean {
    switch (expr.type) {
        case 'ArrayExpression':
            for (const subExpr of expr.elements) {
                if (!subExpr) {
                    // XXX why can elements be null? is it a cheaper way to
                    //     remove elements from an array expression?
                    continue;
                }

                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (expressionHasAwait(focus)) {
                    return true;
                }
            }
            break;
        case 'ArrowFunctionExpression':
            for (const subExpr of expr.params) {
                if (subExpr.type === 'AssignmentPattern' && expressionHasAwait(subExpr.right)) {
                    return true;
                }
            }
            break;
        case 'AssignmentExpression':
            if (expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'AwaitExpression':
            return true;
        case 'BinaryExpression':
            if (expressionHasAwait(expr.left) || expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'CallExpression':
        case 'NewExpression':
            if (expr.callee.type !== 'Super') {
                if (expressionHasAwait(expr.callee)) {
                    return true;
                }
            }

            for (const subExpr of expr.arguments) {
                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (expressionHasAwait(focus)) {
                    return true;
                }
            }
            break;
        case 'ConditionalExpression':
            if (expressionHasAwait(expr.test) || expressionHasAwait(expr.consequent) || expressionHasAwait(expr.alternate)) {
                return true;
            }
            break;
        case 'LogicalExpression':
            if (expressionHasAwait(expr.left) || expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'MemberExpression':
            if (expr.object.type !== 'Super') {
                if (expressionHasAwait(expr.object)) {
                    return true;
                }
            }

            if (expr.property.type !== 'PrivateIdentifier') {
                if (expressionHasAwait(expr.property)) {
                    return true;
                }
            }
            break;
        case 'ObjectExpression':
            for (const prop of expr.properties) {
                if (prop.type === 'SpreadElement') {
                    if (expressionHasAwait(prop.argument)) {
                        return true;
                    }
                } else {
                    if (prop.key.type !== 'PrivateIdentifier' && expressionHasAwait(prop.key)) {
                        return true;
                    }

                    if (isPattern(prop.value)) {
                        if (patternHasAwait(prop.value)) {
                            return true;
                        }
                    } else if (expressionHasAwait(prop.value)) {
                        return true;
                    }
                }
            }
            break;
        case 'TemplateLiteral':
            // XXX i have no idea what this is so it's probably incorrect
            for (const subExpr of expr.expressions) {
                if (expressionHasAwait(subExpr)) {
                    return true;
                }
            }
            break;
        case 'ChainExpression':
        case 'FunctionExpression':
        case 'Identifier':
        case 'ImportExpression':
        case 'Literal':
        case 'MetaProperty':
        case 'ThisExpression':
            // safe, do nothing
            break;
        default:
            // TODO
            throw new Error(`NIY ${expr.type}`)
    }

    return false;
}

function statementHasAwait(stmt: Statement): boolean {
    switch (stmt.type) {
        case 'ExpressionStatement':
            return expressionHasAwait(stmt.expression);
        case 'BlockStatement':
            for (const subStmt of stmt.body) {
                if (statementHasAwait(subStmt)) {
                    return true;
                }
            }
            break;
        case 'ReturnStatement':
            if (stmt.argument) {
                return expressionHasAwait(stmt.argument);
            }
            break;
        case 'IfStatement':
            if (expressionHasAwait(stmt.test) || statementHasAwait(stmt.consequent) || (stmt.alternate && statementHasAwait(stmt.alternate))) {
                return true;
            }
            break;
        case 'SwitchStatement':
            if (expressionHasAwait(stmt.discriminant)) {
                return true;
            }

            for (const switchCase of stmt.cases) {
                if (switchCase.test && expressionHasAwait(switchCase.test)) {
                    return true;
                }

                for (const subStmt of switchCase.consequent) {
                    if (statementHasAwait(subStmt)) {
                        return true;
                    }
                }
            }
            break;
        case 'ThrowStatement':
            if (expressionHasAwait(stmt.argument)) {
                return true;
            }
            break;
        case 'TryStatement':
            if (statementHasAwait(stmt.block)) {
                return true;
            }
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
                if (decl.init && expressionHasAwait(decl.init)) {
                    return true;
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

    return false;
}

function explodeExpressionUntilAwait(expr: Expression) {
    // TODO
}

function explodeStatementUntilAwait(stmt: Statement) {
    // TODO
}

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