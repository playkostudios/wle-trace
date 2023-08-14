import { type UpdateOperator, type UpdateExpression, type Expression } from 'estree';

export function mkUpdateExpression(argument: Expression, operator: UpdateOperator, prefix: boolean): UpdateExpression {
    return { type: 'UpdateExpression', argument, operator, prefix };
}