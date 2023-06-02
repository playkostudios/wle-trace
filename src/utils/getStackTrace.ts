function getStackTraceChromium() {
    const traceObj = {};
    Error.captureStackTrace(traceObj);
    return traceObj.stack;
}

function getStackTraceGeneric() {
    try {
        throw new Error();
    } catch (err) {
        return err.stack ?? '';
    }
}

export const getStackTrace = ('captureStackTrace' in Error) ? getStackTraceChromium : getStackTraceGeneric;
