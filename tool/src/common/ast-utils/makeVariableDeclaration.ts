import { type Expression, type VariableDeclaration } from 'estree';

export function makeVariableDeclaration(name: string, kind: VariableDeclaration['kind'], init?: Expression): VariableDeclaration {
    return {
        type: 'VariableDeclaration',
        kind,
        declarations: [
            {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name,
                },
                init,
            },
        ],
    };
}