export function expressionHasAwait(expr: Expression): boolean {
    switch (expr.type) {
        case 'ArrayExpression':
            for (const subExpr of expr.elements) {
                if (!subExpr) {
                    // XXX why can elements be null? is it a cheaper way to
                    //     remove elements from an array expression?
                    continue;
                }

                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (expressionHasAwait(focus)) {
                    return true;
                }
            }
            break;
        case 'ArrowFunctionExpression':
            for (const subExpr of expr.params) {
                if (subExpr.type === 'AssignmentPattern' && expressionHasAwait(subExpr.right)) {
                    return true;
                }
            }
            break;
        case 'AssignmentExpression':
            if (expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'AwaitExpression':
            return true;
        case 'BinaryExpression':
            if (expressionHasAwait(expr.left) || expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'CallExpression':
        case 'NewExpression':
            if (expr.callee.type !== 'Super') {
                if (expressionHasAwait(expr.callee)) {
                    return true;
                }
            }

            for (const subExpr of expr.arguments) {
                let focus;
                if (subExpr.type === 'SpreadElement') {
                    focus = subExpr.argument;
                } else {
                    focus = subExpr;
                }

                if (expressionHasAwait(focus)) {
                    return true;
                }
            }
            break;
        case 'ConditionalExpression':
            if (expressionHasAwait(expr.test) || expressionHasAwait(expr.consequent) || expressionHasAwait(expr.alternate)) {
                return true;
            }
            break;
        case 'LogicalExpression':
            if (expressionHasAwait(expr.left) || expressionHasAwait(expr.right)) {
                return true;
            }
            break;
        case 'MemberExpression':
            if (expr.object.type !== 'Super') {
                if (expressionHasAwait(expr.object)) {
                    return true;
                }
            }

            if (expr.property.type !== 'PrivateIdentifier') {
                if (expressionHasAwait(expr.property)) {
                    return true;
                }
            }
            break;
        case 'ObjectExpression':
            for (const prop of expr.properties) {
                if (prop.type === 'SpreadElement') {
                    if (expressionHasAwait(prop.argument)) {
                        return true;
                    }
                } else {
                    if (prop.key.type !== 'PrivateIdentifier' && expressionHasAwait(prop.key)) {
                        return true;
                    }

                    if (isPattern(prop.value)) {
                        if (patternHasAwait(prop.value)) {
                            return true;
                        }
                    } else if (expressionHasAwait(prop.value)) {
                        return true;
                    }
                }
            }
            break;
        case 'TemplateLiteral':
            // XXX i have no idea what this is so it's probably incorrect
            for (const subExpr of expr.expressions) {
                if (expressionHasAwait(subExpr)) {
                    return true;
                }
            }
            break;
        case 'ChainExpression':
        case 'FunctionExpression':
        case 'Identifier':
        case 'ImportExpression':
        case 'Literal':
        case 'MetaProperty':
        case 'ThisExpression':
            // safe, do nothing
            break;
        default:
            // TODO
            throw new Error(`NIY ${expr.type}`)
    }

    return false;
}