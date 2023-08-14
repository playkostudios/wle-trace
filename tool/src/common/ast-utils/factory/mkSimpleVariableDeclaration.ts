import { type Expression, type VariableDeclaration } from 'estree';
import { mkIdentifier } from './mkIdentifier.js';

export function mkSimpleVariableDeclaration(name: string, kind: VariableDeclaration['kind'], init?: Expression): VariableDeclaration {
    return {
        type: 'VariableDeclaration',
        kind,
        declarations: [
            {
                type: 'VariableDeclarator',
                id: mkIdentifier(name),
                init,
            },
        ],
    };
}