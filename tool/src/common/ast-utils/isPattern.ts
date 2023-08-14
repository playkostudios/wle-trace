import { type BaseNode, type Pattern } from 'estree';

export function isPattern(maybePattern: Pattern | BaseNode): maybePattern is Pattern {
    switch (maybePattern.type) {
        case 'Identifier':
        case 'ObjectPattern':
        case 'ArrayPattern':
        case 'RestElement':
        case 'AssignmentPattern':
        case 'MemberExpression':
            return true;
        default:
            return false;
    }
}