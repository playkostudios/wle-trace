import { type ArrowFunctionExpression, type Expression } from 'estree';
import { type SyncBodyHookASTInjectionContext } from '../../types/SyncBodyHookASTInjectionContext.js';
import { hookIntoSyncPatternParts } from './hookIntoSyncPatternParts.js';
import { hookIntoSyncFuncSubBlockParts } from './hookIntoSyncFuncSubBlockParts.js';
import { mkBlockStatement } from '../factory/mkBlockStatement.js';
import { mkReturnStatement } from '../factory/mkReturnStatement.js';
import { hookIntoSyncClassBodyParts } from './hookIntoSyncClassBodyParts.js';
import { isPattern } from '../test/isPattern.js';
import { mkIdentifier } from '../factory/mkIdentifier.js';

export function hookIntoSyncExpressionParts(expr: Expression, injectionContext: SyncBodyHookASTInjectionContext): void {
    switch (expr.type) {
        case 'ArrayExpression':
            for (const subExpr of expr.elements) {
                if (!subExpr) {
                    // XXX why can elements be null? is it a cheaper way to
                    //     remove elements from an array expression?
                    continue;
                }

                if (subExpr.type === 'SpreadElement') {
                    hookIntoSyncExpressionParts(subExpr.argument, injectionContext);
                } else {
                    hookIntoSyncExpressionParts(subExpr, injectionContext);
                }
            }
            break;
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
            for (const subExpr of expr.params) {
                hookIntoSyncPatternParts(subExpr, injectionContext);
            }

            // XXX normalize arrow function to block statement so we can hook
            // into it when needed
            if (expr.body.type !== 'BlockStatement') {
                expr.body = mkBlockStatement([
                    mkReturnStatement(expr.body),
                ]);
                (expr as ArrowFunctionExpression).expression = false;
            }

            // XXX increment the state counter when hooked so that we can handle
            // promise callbacks
            hookIntoSyncFuncSubBlockParts(expr.body.body, injectionContext);
            break;
        case 'AssignmentExpression':
            hookIntoSyncPatternParts(expr.left, injectionContext);
            hookIntoSyncExpressionParts(expr.right, injectionContext);
            break;
        case 'AwaitExpression':
            // XXX wrap await expressions with await hooks
            expr.argument = {
                type: 'CallExpression',
                callee: mkIdentifier(injectionContext.awaitHookName),
                arguments: [expr.argument],
                optional: false,
            };
            break;
        case 'BinaryExpression':
        case 'LogicalExpression':
            hookIntoSyncExpressionParts(expr.left, injectionContext);
            hookIntoSyncExpressionParts(expr.right, injectionContext);
            break;
        case 'CallExpression':
        case 'NewExpression':
            for (const subExpr of expr.arguments) {
                if (subExpr.type === 'SpreadElement') {
                    hookIntoSyncExpressionParts(subExpr.argument, injectionContext);
                } else {
                    hookIntoSyncExpressionParts(subExpr, injectionContext);
                }
            }

            if (expr.callee.type !== 'Super') {
                hookIntoSyncExpressionParts(expr.callee, injectionContext);
            }
            break;
        case 'ChainExpression':
            hookIntoSyncExpressionParts(expr.expression, injectionContext);
            break;
        case 'ClassExpression':
            if (expr.superClass) {
                hookIntoSyncExpressionParts(expr.superClass, injectionContext);
            }
            hookIntoSyncClassBodyParts(expr.body, injectionContext);
            break;
        case 'ConditionalExpression':
            hookIntoSyncExpressionParts(expr.test, injectionContext);
            hookIntoSyncExpressionParts(expr.consequent, injectionContext);
            hookIntoSyncExpressionParts(expr.alternate, injectionContext);
            break;
        case 'MemberExpression':
            if (expr.object.type !== 'Super') {
                hookIntoSyncExpressionParts(expr.object, injectionContext);
            }

            if (expr.property.type !== 'PrivateIdentifier') {
                hookIntoSyncExpressionParts(expr.property, injectionContext);
            }
            break;
        case 'ObjectExpression':
            for (const prop of expr.properties) {
                if (prop.type === 'SpreadElement') {
                    hookIntoSyncExpressionParts(prop.argument, injectionContext);
                } else {
                    if (prop.key.type !== 'PrivateIdentifier') {
                        hookIntoSyncExpressionParts(prop.key, injectionContext);
                    }

                    if (isPattern(prop.value)) {
                        hookIntoSyncPatternParts(prop.value, injectionContext);
                    } else {
                        hookIntoSyncExpressionParts(prop.value, injectionContext);
                    }
                }
            }
            break;
        case 'SequenceExpression':
            for (const subExpr of expr.expressions) {
                hookIntoSyncExpressionParts(subExpr, injectionContext);
            }
            break;
        case 'TaggedTemplateExpression':
            hookIntoSyncExpressionParts(expr.tag, injectionContext);
            hookIntoSyncExpressionParts(expr.quasi, injectionContext);
            break;
        case 'TemplateLiteral':
            for (const subExpr of expr.expressions) {
                hookIntoSyncExpressionParts(subExpr, injectionContext);
            }
            break;
        case 'UnaryExpression':
        case 'UpdateExpression':
            hookIntoSyncExpressionParts(expr.argument, injectionContext);
            break;
        case 'YieldExpression':
            if (expr.argument) {
                hookIntoSyncExpressionParts(expr.argument, injectionContext);
            }
            break;
        case 'Identifier':
        case 'ImportExpression':
        case 'Literal':
        case 'MetaProperty':
        case 'ThisExpression':
            break; // XXX safe, do nothing
    }
}