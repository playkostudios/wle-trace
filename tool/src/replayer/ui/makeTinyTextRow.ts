import { makeTextRow } from './makeTextRow.js';

export function makeTinyTextRow(container: HTMLElement, text: string) {
    const span = makeTextRow(container, text);
    span.style.fontSize = '0.7rem';
    return span;
}