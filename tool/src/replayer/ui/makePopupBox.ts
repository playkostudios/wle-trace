import { makeTextRow } from './makeTextRow.js';

export function makePopupBox(titleText: string) {
    const backdrop = document.createElement('div');
    backdrop.style.background = 'rgba(0,0,0,0.5)';
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.position = 'absolute';
    backdrop.style.zIndex = '99999';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.fontFamily = 'sans';
    document.body.appendChild(backdrop);

    const container = document.createElement('div');
    container.style.background = 'white';
    container.style.position = 'absolute';
    container.style.top = '50vh';
    container.style.left = '50vw';
    container.style.transform = 'translateX(-50%) translateY(-50%)';
    container.style.padding = '16px';
    container.style.borderRadius = '16px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    backdrop.appendChild(container);

    const title = makeTextRow(container, titleText);
    title.style.fontWeight = 'bold';
    title.style.textAlign = 'center';
    title.style.marginBottom = '8px';

    return [backdrop, container];
}