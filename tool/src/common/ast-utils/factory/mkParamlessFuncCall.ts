import { type ExpressionStatement } from 'estree';
import { mkIdentifier } from './mkIdentifier.js';

export function mkParamlessFuncCall(name: string): ExpressionStatement {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'CallExpression',
            callee: mkIdentifier(name),
            arguments: [],
            optional: false,
        },
    };
}