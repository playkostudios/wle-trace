import { makePopupBox } from './ui/makePopupBox.js';
import { makeTextRow } from './ui/makeTextRow.js';
import { makeFileInput } from './ui/makeFileInput.js';
import { makeSeparator } from './ui/makeSeparator.js';
import { makeErrorTextRow } from './ui/makeErrorTextRow.js';
import { makeBRButton } from './ui/makeBRButton.js';
import { makeTinyTextRow } from './ui/makeTinyTextRow.js';
import { makeMutableTextRow } from './ui/makeMutableTextRow.js';
import { WLETraceReplayer } from './WLETraceReplayer.js';
import { makeSnackbar } from './ui/makeSnackbar.js';

function makeReplayerFromRuntimePopup(): Promise<WLETraceReplayer> {
    return new Promise((resolve, reject) => {
        const [backdrop, container] = makePopupBox('wle-trace replayer - runtime loader');

        let binary: File | null = null;
        let loader: File | null = null;
        let loadingScreen: File | null = null;

        // TODO allow urls in picker. only picker needs to be updated,
        //      download logic is already done
        makeTextRow(container, 'Engine binary:');
        makeTinyTextRow(container, 'e.g. "WonderlandRuntime.wasm"');
        makeFileInput(container, (f) => binary = f, '.wasm');
        makeTextRow(container, 'Engine loader:');
        makeTinyTextRow(container, 'e.g. "WonderlandRuntime.js"');
        makeFileInput(container, (f) => loader = f, '.js');
        makeTextRow(container, 'Loading screen:');
        makeTinyTextRow(container, 'e.g. "WonderlandRuntime-LoadingScreen.bin"');
        makeFileInput(container, (f) => loadingScreen = f, '.bin');
        makeSeparator(container);
        const [_statusSpan, clearStatus, setStatus] = makeMutableTextRow(container);
        const [_errorSpan, clearError, setError] = makeErrorTextRow(container);

        async function getFileOrDownload(file: string | File): Promise<ArrayBuffer> {
            let fileLike;
            if (typeof file === 'string') {
                setStatus(`Downloading ${file}...`);
                fileLike = await fetch(file);
                clearStatus();
                if (!fileLike.ok) {
                    throw `Bad HTTP status: ${fileLike.status} ${fileLike.statusText}`;
                }
            } else {
                fileLike = file;
            }

            setStatus('Getting file data...');
            const buf = await fileLike.arrayBuffer();
            clearStatus();
            return buf;
        }

        const loadButton = makeBRButton(container, 'Load runtime', async () => {
            loadButton.disabled = true;
            clearError();
            clearStatus();
            let argTuple: null | [ArrayBuffer, ArrayBuffer, ArrayBuffer] = null;

            try {
                if (!binary) {
                    throw 'Engine binary not picked';
                }
                if (!loader) {
                    throw 'Engine loader not picked';
                }
                if (!loadingScreen) {
                    throw 'Loading screen not picked';
                }

                const binaryBuf = await getFileOrDownload(binary);
                const loaderBuf = await getFileOrDownload(loader);
                const loadingScreenBuf = await getFileOrDownload(loadingScreen);

                argTuple = [binaryBuf, loaderBuf, loadingScreenBuf];
            } catch (err) {
                setError(err);
            } finally {
                clearStatus();
                loadButton.disabled = false;
            }

            if (argTuple !== null) {
                document.body.removeChild(backdrop);

                try {
                    const replayer = new WLETraceReplayer(...argTuple);
                    await replayer.waitForReady();
                    resolve(replayer);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function startFromUploadPopup(replayer: WLETraceReplayer): Promise<void> {
    return new Promise((resolve, reject) => {
        const [backdrop, container] = makePopupBox('wle-trace replayer - demo file picker');

        let demo: File | null = null;

        // TODO allow urls in picker. only picker needs to be updated,
        //      download logic is already done
        makeTextRow(container, 'Demo file:');
        makeTinyTextRow(container, 'e.g. "demo-1688566319760.wletd"');
        makeFileInput(container, (f) => demo = f, '.wletd');
        makeSeparator(container);
        const [_statusSpan, clearStatus, setStatus] = makeMutableTextRow(container);
        const [_errorSpan, clearError, setError] = makeErrorTextRow(container);

        async function getFileOrDownload(file: string | File): Promise<ArrayBuffer> {
            let fileLike;
            if (typeof file === 'string') {
                setStatus(`Downloading ${file}...`);
                fileLike = await fetch(file);
                clearStatus();
                if (!fileLike.ok) {
                    throw `Bad HTTP status: ${fileLike.status} ${fileLike.statusText}`;
                }
            } else {
                fileLike = file;
            }

            setStatus('Getting file data...');
            const buf = await fileLike.arrayBuffer();
            clearStatus();
            return buf;
        }

        const loadButton = makeBRButton(container, 'Load demo', async () => {
            loadButton.disabled = true;
            clearError();
            clearStatus();
            let demoBuf: null | ArrayBuffer = null;

            try {
                if (!demo) {
                    throw 'Demo file not picked';
                }

                demoBuf = await getFileOrDownload(demo);
            } catch (err) {
                setError(err);
            } finally {
                clearStatus();
                loadButton.disabled = false;
            }

            if (demoBuf !== null) {
                document.body.removeChild(backdrop);

                try {
                    replayer.start(demoBuf);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

export function showVisualReplayer(onStarted?: (replayer: WLETraceReplayer) => void): Promise<void> {
    return new Promise(async (resolve, reject) => {
        let done = false;
        try {
            const replayer = await makeReplayerFromRuntimePopup();

            replayer.onEnded((isError, err) => {
                if (done) {
                    return;
                }

                done = true;
                if (isError) {
                    makeSnackbar('Replay ended; error occurred, check console for details', true);
                    reject(err);
                } else {
                    makeSnackbar('Replay ended; end reached');
                    resolve();
                }
            });

            await startFromUploadPopup(replayer);

            if (onStarted) {
                onStarted(replayer);
            }
        } catch (err) {
            if (done) {
                return;
            }

            done = true;
            makeSnackbar('Replay failed to start; check console for details', true);
            reject(err);
        }
    })
}