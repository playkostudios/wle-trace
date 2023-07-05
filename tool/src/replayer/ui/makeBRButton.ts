export function makeBRButton(container: HTMLElement, text: string, onClick: () => void) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'row-reverse';
    container.appendChild(row);

    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    row.appendChild(button);

    return button;
}