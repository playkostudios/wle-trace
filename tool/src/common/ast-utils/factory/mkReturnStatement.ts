import { type Expression, type ReturnStatement } from 'estree';

export function mkReturnStatement(argument?: Expression): ReturnStatement {
    return { type: 'ReturnStatement', argument };
}