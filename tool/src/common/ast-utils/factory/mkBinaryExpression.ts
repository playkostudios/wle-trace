import { type Expression, type BinaryExpression, type BinaryOperator } from 'estree';

export function mkBinaryExpression(left: Expression, operator: BinaryOperator, right: Expression): BinaryExpression {
    return { type: 'BinaryExpression', operator, left, right };
}