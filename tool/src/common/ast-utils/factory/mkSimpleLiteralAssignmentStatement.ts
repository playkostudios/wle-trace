import { type ExpressionStatement, type SimpleLiteral } from 'estree';
import { mkSimpleLiteral } from './mkSimpleLiteral.js';
import { mkIdentifier } from './mkIdentifier.js';

export function mkSimpleLiteralAssignmentStatement(name: string, value: SimpleLiteral['value']): ExpressionStatement {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: mkIdentifier(name),
            right: mkSimpleLiteral(value),
        },
    };
}