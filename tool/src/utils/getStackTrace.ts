function getStackTraceChromium() {
    const traceObj = { stack: '' };
    (Error as unknown as { captureStackTrace(obj: object): void }).captureStackTrace(traceObj);
    return traceObj.stack;
}

function getStackTraceGeneric() {
    try {
        throw new Error();
    } catch (err) {
        return (err as Error).stack ?? '';
    }
}

export const getStackTrace = ('captureStackTrace' in Error) ? getStackTraceChromium : getStackTraceGeneric;
