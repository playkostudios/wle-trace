import { type WonderlandEngine } from '@wonderlandengine/api';
import { MAGIC } from './replay/common.js';
import { type ReplayBuffer } from './replay/ReplayBuffer.js';
import { ReplayBufferV1 } from './replay/ReplayBufferV1.js';

export class WLETraceReplayer implements ReplayBuffer {
    private engine: WonderlandEngine | null = null;
    private replayBuffer: ReplayBuffer | null = null;

    get ended(): boolean {
        return this.replayBuffer === null || this.replayBuffer.ended;
    }

    get replaying(): boolean {
        return this.replayBuffer !== null;
    }

    start(buffer: ArrayBuffer) {
        if (this.replayBuffer) {
            throw new Error("Can't start replay; already replaying something");
        }

        if (!this.engine) {
            throw new Error("Can't start replay; engine not loaded");
        }

        // verify magic and get version
        const magicSize = MAGIC.byteLength;
        if (buffer.byteLength < (magicSize + 2)) {
            throw new Error('Invalid demo file; too small');
        }

        const thisMagic = new Uint8Array(buffer, 0, magicSize);
        for (let i = 0; i < magicSize; i++) {
            if (thisMagic[i] !== MAGIC[i]) {
                throw new Error('Invalid demo file; wrong magic number');
            }
        }

        const bufferView = new DataView(buffer);
        const version = bufferView.getUint16(magicSize);

        // actually start parsing replay file with correct parser, or complain
        // about invalid versions
        if (version === 1) {
            this.replayBuffer = new ReplayBufferV1(this.engine, buffer, magicSize + 2);
        } else {
            throw new Error(`Invalid demo file; unsupported format version (${version})`);
        }

        // start replay
        console.debug(`[wle-trace CONTROLLER] Replay mode active. Loading WLE demo file with ${buffer.byteLength} bytes`);
        this.continue();
    }

    startFromUpload() {
        const fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.style.display = 'none';
        document.body.appendChild(fileIn);
        fileIn.addEventListener('change', async () => {
            const file = fileIn.files?.[0];
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                this.start(arrayBuffer);
            }
        });

        fileIn.click();
        document.body.removeChild(fileIn);
    }

    startFromUploadPopup() {
        const popup = document.createElement('button');
        popup.textContent = 'Click to upload replay file';
        popup.onclick = () => {
            this.startFromUpload();
            document.body.removeChild(popup);
        };
        document.body.appendChild(popup);
    }

    setEngine(engine: WonderlandEngine) {
        if (this.engine) {
            throw new Error('Engine already set; are you reusing a replayer?');
        }

        this.engine = engine;
    }

    markCallbackAsReplayed(methodName: string, args: unknown[]): unknown {
        if (this.replayBuffer) {
            const retVal = this.replayBuffer.markCallbackAsReplayed(methodName, args);

            if (this.replayBuffer.ended) {
                this.disposeReplayBuffer();
            }

            return retVal;
        } else {
            console.warn('[wle-trace REPLAYER] callback ignored; not replaying');
            return;
        }
    }

    continue(): boolean {
        if (this.replayBuffer) {
            if (this.replayBuffer.continue()) {
                return true;
            } else {
                this.disposeReplayBuffer();
                return false;
            }
        } else {
            return false;
        }
    }

    private disposeReplayBuffer() {
        if (!this.replayBuffer) {
            throw new Error('Already disposed or not initialized');
        }

        console.debug('[wle-trace CONTROLLER] Replay ended');
        this.replayBuffer = null;
    }
}