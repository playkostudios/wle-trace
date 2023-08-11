export function statementHasAwait(stmt: Statement): boolean {
    switch (stmt.type) {
        case 'ExpressionStatement':
            return expressionHasAwait(stmt.expression);
        case 'BlockStatement':
            for (const subStmt of stmt.body) {
                if (statementHasAwait(subStmt)) {
                    return true;
                }
            }
            break;
        case 'ReturnStatement':
            if (stmt.argument) {
                return expressionHasAwait(stmt.argument);
            }
            break;
        case 'IfStatement':
            if (expressionHasAwait(stmt.test) || statementHasAwait(stmt.consequent) || (stmt.alternate && statementHasAwait(stmt.alternate))) {
                return true;
            }
            break;
        case 'SwitchStatement':
            if (expressionHasAwait(stmt.discriminant)) {
                return true;
            }

            for (const switchCase of stmt.cases) {
                if (switchCase.test && expressionHasAwait(switchCase.test)) {
                    return true;
                }

                for (const subStmt of switchCase.consequent) {
                    if (statementHasAwait(subStmt)) {
                        return true;
                    }
                }
            }
            break;
        case 'ThrowStatement':
            if (expressionHasAwait(stmt.argument)) {
                return true;
            }
            break;
        case 'TryStatement':
            if (statementHasAwait(stmt.block)) {
                return true;
            }
            break;
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
            // TODO
            throw new Error('NIY');
        case 'VariableDeclaration':
            for (const decl of stmt.declarations) {
                if (decl.init && expressionHasAwait(decl.init)) {
                    return true;
                }
            }
            break;
        case 'FunctionDeclaration':
        case 'ClassDeclaration': // XXX technically this might be unsafe if there is a static variable with await, but that's a super rare edge-case
        case 'EmptyStatement':
        case 'DebuggerStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
            // XXX safe, do nothing
            break;
        case 'StaticBlock':
        case 'LabeledStatement':
        case 'WithStatement': // XXX with is unexpected just because it's bad, even though it would be valid here
            throw new Error(`Unexpected statement type: "${stmt.type}"`);
    }

    return false;
}