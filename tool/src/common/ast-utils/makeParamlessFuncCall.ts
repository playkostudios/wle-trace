import { type ExpressionStatement } from 'estree';

export function makeParamlessFuncCall(name: string): ExpressionStatement {
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