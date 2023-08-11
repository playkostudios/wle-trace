export function makeSimpleLiteralAssignmentStatement(name: string, value: SimpleLiteral['value']): ExpressionStatement {
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