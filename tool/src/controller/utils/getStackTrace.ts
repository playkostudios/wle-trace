function getStackTraceChromium() {
    const traceObj = { stack: '' };
    (Error as unknown as { captureStackTrace(obj: object): void }).captureStackTrace(traceObj);

    let trace = traceObj.stack;
    const newlineIdx = trace.indexOf('\n');
    const firstLine = trace.slice(0, newlineIdx);

    if (firstLine.startsWith('Error')) {
        // XXX chromium stack traces can have the exception in the first line
        trace = trace.slice(newlineIdx + 1);
    }

    return trace;
}

function getStackTraceGeneric() {
    try {
        throw new Error();
    } catch (err) {
        let trace = (err as Error).stack ?? '';

        if (trace === '') {
            return trace;
        }

        const lines = trace.split('\n');
        const lineCount = lines.length;

        for (let i = 0; i < lineCount; i++) {
            const line = lines[i];
            if (line !== '') {
                lines[i] = `    ${line}`;
            }
        }

        return lines.join('\n');
    }
}

export const getStackTrace = ('captureStackTrace' in Error) ? getStackTraceChromium : getStackTraceGeneric;
