export function makeTextRow(container: HTMLElement, text: string) {
    const span = document.createElement('span');
    span.textContent = text;
    container.appendChild(span);
    return span;
}