import { makeTextRow } from './makeTextRow.js';

export function makeMutableTextRow(container: HTMLElement): [span: HTMLSpanElement, clearText: () => void, setText: (text: string) => void] {
    const span = makeTextRow(container, '');
    span.style.display = 'none';

    return [
        span,
        () => span.style.display = 'none',
        (text: string) => {
            span.textContent = text;
            span.style.display = 'initial';
        }
    ];
}