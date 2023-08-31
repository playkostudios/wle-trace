import { getGlobalSWInjector } from '../../common/WLETraceSWInjector.js';
import { WLETraceRecorder } from '../WLETraceRecorder.js';
import { injectRecorderHooks } from '../inject/injectRecorderHooks.js';
import { makeOutOfPlaceRecorderHook } from '../inject/makeOutOfPlaceRecorderHook.js';
import { type MethodTypeMapsJSON } from '../types/MethodTypeMapsJSON.js';
import { injectTypedArrayRecorder } from './TypedArray.js';

export async function recordWLETrace(typeMapJSON?: MethodTypeMapsJSON): Promise<WLETraceRecorder> {
    const swInjector = getGlobalSWInjector();
    const loadRuntime = await swInjector.makeLoadRuntimeWrapper((imports, context) => {
        for (const moduleImports of Object.values(imports)) {
            for (const importName of Object.keys(moduleImports)) {
                injectRecorderHooks(false, recorder, moduleImports, importName);
            }
        }

        console.debug('stage 2 injector called!', imports, context);
    }, (instantiatedSource, context) => {
        // XXX can't wrap exports in-place because wasm instance objects are
        //     read-only
        const newExports: WebAssembly.Exports = {};
        for (const [exportName, origExport] of Object.entries(instantiatedSource.instance.exports)) {
            if (origExport instanceof WebAssembly.Global) {
                throw new Error('WebAssembly globals are not supported by wle-trace');
            } else if (origExport instanceof WebAssembly.Memory) {
                // TODO
                newExports[exportName] = origExport;
            } else if (origExport instanceof WebAssembly.Table) {
                // TODO
                newExports[exportName] = origExport;
            } else {
                newExports[exportName] = makeOutOfPlaceRecorderHook(true, recorder, exportName, origExport);
            }
        }

        console.debug('stage 3 injector called!', instantiatedSource, context);

        return {
            instance: {
                exports: newExports,
            },
            module: instantiatedSource.module,
        };
    });

    const recorder = new WLETraceRecorder(loadRuntime);

    if (typeMapJSON) {
        recorder.registerTypeMapsFromJSON(typeMapJSON);
    }

    // injectTypedArrayRecorder(recorder);
    // await recorder.waitForReady();

    return recorder;
}