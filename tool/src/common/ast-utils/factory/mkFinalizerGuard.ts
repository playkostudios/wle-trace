import { type BlockStatement, type TryStatement } from 'estree';

export function mkFinalizerGuard(block: BlockStatement, finalizer: BlockStatement): TryStatement {
    return { type: 'TryStatement', block, finalizer };
}