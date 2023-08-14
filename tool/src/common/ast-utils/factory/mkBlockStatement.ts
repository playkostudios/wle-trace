import { type BlockStatement, type Statement } from 'estree';

export function mkBlockStatement(body: Statement[]): BlockStatement {
    return { type: 'BlockStatement', body };
}