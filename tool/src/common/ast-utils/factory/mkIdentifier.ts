import { type Identifier } from 'estree';

export function mkIdentifier(name: string): Identifier {
    return { type: 'Identifier', name };
}