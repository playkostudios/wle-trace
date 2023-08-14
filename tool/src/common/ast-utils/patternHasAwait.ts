import { type Pattern } from 'estree';
import { expressionHasAwait } from './expressionHasAwait.js';
import { isPattern } from './isPattern.js';

export function patternHasAwait(pattern: Pattern): boolean {
    switch (pattern.type) {
        case 'Identifier':
            return false;
        case 'ObjectPattern':
            for (const prop of pattern.properties) {
                if (prop.type === 'RestElement') {
                    if (patternHasAwait(prop.argument)) {
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
        case 'ArrayPattern':
            for (const subPattern of pattern.elements) {
                if (subPattern && patternHasAwait(subPattern)) {
                    return true;
                }
            }
            break;
        case 'RestElement':
            if (patternHasAwait(pattern.argument)) {
                return true;
            }
            break;
        case 'AssignmentPattern':
            if (patternHasAwait(pattern.left) || expressionHasAwait(pattern.right)) {
                return true;
            }
            break;
        case 'MemberExpression':
            if (pattern.property.type !== 'PrivateIdentifier' && expressionHasAwait(pattern.property)) {
                return true;
            }
            break;
    }

    return false;
}