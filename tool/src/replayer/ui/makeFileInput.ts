export function makeFileInput(container: HTMLElement, onChange: (file: File) => void, extensions?: string) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'row';
    row.style.marginTop = '4px';
    row.style.marginBottom = '4px';
    container.appendChild(row);

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    if (extensions !== undefined) {
        input.accept = extensions;
    }

    row.appendChild(input);

    const displayTextBox = document.createElement('input');
    displayTextBox.readOnly = true;
    displayTextBox.disabled = true;
    displayTextBox.placeholder = 'No file picked...';
    displayTextBox.style.flex = '1';
    displayTextBox.style.border = '1px solid grey';
    displayTextBox.style.marginRight = '4px';
    displayTextBox.style.borderRadius = '3px';
    row.appendChild(displayTextBox);

    const button = document.createElement('button');
    button.textContent = 'Pick file';
    row.appendChild(button);

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) {
            displayTextBox.value = file.name;
            onChange(file);
        }
    });

    button.addEventListener('click', () => input.click());
}