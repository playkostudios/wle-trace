import { makeTextRow } from './makeTextRow.js';

export function makeSnackbar(text: string, isError = false) {
    const container = document.createElement('div');
    container.style.background = 'white';
    container.style.position = 'absolute';
    container.style.top = '8px';
    container.style.left = '50vw';
    container.style.transform = 'translateX(-50%)';
    container.style.padding = '16px';
    container.style.borderRadius = '16px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    document.body.appendChild(container);

    const span = makeTextRow(container, text);
    span.style.fontWeight = 'bold';

    if (isError) {
        span.style.color = 'orangered';
    }
}