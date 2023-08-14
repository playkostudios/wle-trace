import { type Expression, type Statement, type IfStatement } from 'estree';

export function mkIfStatement(test: Expression, consequent: Statement, alternate?: Statement): IfStatement {
    return { type: 'IfStatement', test, consequent, alternate };
}