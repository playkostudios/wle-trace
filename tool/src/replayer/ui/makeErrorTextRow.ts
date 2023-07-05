import { makeMutableTextRow } from './makeMutableTextRow.js';

export function makeErrorTextRow(container: HTMLElement): [span: HTMLSpanElement, clearError: () => void, setError: (error: unknown) => void] {
    const [span, clearText, setText] = makeMutableTextRow(container);
    span.style.color = 'orangered';

    return [
        span,
        clearText,
        (error: unknown) => {
            let errStr;
            if (error instanceof Error) {
                errStr = error.message;
            } else {
                errStr = String(error);
            }

            setText(errStr);
        }
    ];
}