import { type Literal } from 'estree';

export function mkSimpleLiteral(value: string | boolean | number | null): Literal {
    return { type: 'Literal', value };
}