import { type ThrowStatement } from 'estree';
import { mkIdentifier } from './mkIdentifier.js';
import { mkSimpleLiteral } from './mkSimpleLiteral.js';

export function mkThrowErrorStatement(message: string): ThrowStatement {
    return {
        type: 'ThrowStatement',
        argument: {
            type: 'NewExpression',
            callee: mkIdentifier('Error'),
            arguments: [
                mkSimpleLiteral(message),
            ],
        },
    };
}