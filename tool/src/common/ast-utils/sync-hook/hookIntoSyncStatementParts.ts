import { type Statement } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { hookIntoSyncExpressionParts } from './hookIntoSyncExpressionParts.js';
import { hookIntoSyncBodyParts } from './hookIntoSyncBodyParts.js';
import { hookIntoSyncPatternParts } from './hookIntoSyncPatternParts.js';
import { hookIntoSyncClassBodyParts } from './hookIntoSyncClassBodyParts.js';
import { hookIntoSyncFuncSubBlockParts } from './hookIntoSyncFuncSubBlockParts.js';

export function hookIntoSyncStatementParts(stmt: Statement, injectionContext: SyncBodyHookASTInjectionContext): void {
    switch (stmt.type) {
        case 'ExpressionStatement':
            hookIntoSyncExpressionParts(stmt.expression, injectionContext);
            break;
        case 'BlockStatement':
        case 'StaticBlock':
            hookIntoSyncBodyParts(stmt.body, injectionContext);
            break;
        case 'ReturnStatement':
            if (stmt.argument) {
                hookIntoSyncExpressionParts(stmt.argument, injectionContext);
            }
            break;
        case 'IfStatement':
            hookIntoSyncExpressionParts(stmt.test, injectionContext);
            hookIntoSyncStatementParts(stmt.consequent, injectionContext);
            if (stmt.alternate) {
                hookIntoSyncStatementParts(stmt.alternate, injectionContext);
            }
            break;
        case 'SwitchStatement':
            hookIntoSyncExpressionParts(stmt.discriminant, injectionContext);

            for (const switchCase of stmt.cases) {
                if (switchCase.test) {
                    hookIntoSyncExpressionParts(switchCase.test, injectionContext);
                }

                hookIntoSyncBodyParts(switchCase.consequent, injectionContext);
            }
            break;
        case 'ThrowStatement':
            hookIntoSyncExpressionParts(stmt.argument, injectionContext);
            break;
        case 'TryStatement':
            hookIntoSyncStatementParts(stmt.block, injectionContext);
            break;
        case 'WhileStatement':
        case 'DoWhileStatement':
            hookIntoSyncExpressionParts(stmt.test, injectionContext);
            hookIntoSyncStatementParts(stmt.body, injectionContext);
            break;
        case 'ForStatement':
            if (stmt.init) {
                if (stmt.init.type === 'VariableDeclaration') {
                    hookIntoSyncStatementParts(stmt.init, injectionContext);
                } else {
                    hookIntoSyncExpressionParts(stmt.init, injectionContext);
                }
            }
            if (stmt.test) {
                hookIntoSyncExpressionParts(stmt.test, injectionContext);
            }
            if (stmt.update) {
                hookIntoSyncExpressionParts(stmt.update, injectionContext);
            }
            hookIntoSyncStatementParts(stmt.body, injectionContext);
            break;
        case 'ForInStatement':
        case 'ForOfStatement':
            if (stmt.left.type === 'VariableDeclaration') {
                hookIntoSyncStatementParts(stmt.left, injectionContext);
            } else {
                hookIntoSyncPatternParts(stmt.left, injectionContext);
            }
            hookIntoSyncExpressionParts(stmt.right, injectionContext);
            hookIntoSyncStatementParts(stmt.body, injectionContext);
            break;
        case 'FunctionDeclaration':
            for (const ptrn of stmt.params) {
                hookIntoSyncPatternParts(ptrn, injectionContext);
            }

            // XXX increment the state counter when hooked so that we can handle
            // promise callbacks
            hookIntoSyncFuncSubBlockParts(stmt.body.body, injectionContext);
            break;
        case 'VariableDeclaration':
            for (const decl of stmt.declarations) {
                hookIntoSyncPatternParts(decl.id, injectionContext);
                if (decl.init) {
                    hookIntoSyncExpressionParts(decl.init, injectionContext);
                }
            }
            break;
        case 'ClassDeclaration':
            if (stmt.superClass) {
                hookIntoSyncExpressionParts(stmt.superClass, injectionContext);
            }
            hookIntoSyncClassBodyParts(stmt.body, injectionContext);
            break;
        case 'EmptyStatement':
        case 'DebuggerStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
            // XXX safe, do nothing
            break;
        case 'LabeledStatement':
        case 'WithStatement': // XXX with is unexpected just because it's bad, even though it would be valid here
        default:
            throw new Error(`Unexpected statement type: "${stmt.type}"`);
    }
}