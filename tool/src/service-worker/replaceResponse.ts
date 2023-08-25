import { type Program } from 'estree';
import { parse } from 'acorn';
import { patchStage1Injector } from './patchStage1Injector.js';

const textEncoder = new TextEncoder();

export async function replaceResponse(req: Request, injectionID: number) {
    let origResponse;
    try {
        origResponse = await fetch(req);
    } catch(err) {
        return Promise.reject(err);
    }

    if (!origResponse.ok) {
        return origResponse;
    }

    let patchedSourceCode: Uint8Array;
    try {
        // downloaded, patch file with stage 1 injector which calls stage 2
        // injector
        // XXX need to clone response since body can only be used once, and we
        //     return the original response when an error occurs
        const node = parse(await origResponse.clone().text(), {
            ecmaVersion: 'latest', sourceType: 'script', locations: false,
        });

        let program: Program;
        if (node.type === 'Program') {
            program = node as unknown as Program;
        } else {
            throw new Error('AST parser did not return a program');
        }

        patchedSourceCode = textEncoder.encode(patchStage1Injector(program, injectionID));
    } catch(err) {
        console.error('[wle-trace:service-worker] Failed to patch engine loader with stage 1 injector:');
        console.error(err);
        return origResponse;
    }

    // done patching, replace response
    const headers = new Headers(origResponse.headers);
    headers.set('Content-Type', 'application/javascript; charset=utf-8');
    headers.set('Content-Length', `${patchedSourceCode.byteLength}`);

    return new Response(patchedSourceCode, {
        headers,
        status: origResponse.status,
        statusText: origResponse.statusText,
    });
}