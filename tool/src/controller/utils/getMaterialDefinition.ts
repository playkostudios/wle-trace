import { type MaterialDefinition, type Material } from '@wonderlandengine/api';

export function getMaterialDefinition(mat: Material): Readonly<ReadonlyMap<string | symbol, MaterialDefinition>> | null {
    const defIdx = (mat as unknown as { _definition: number })._definition;
    return mat.engine.wasm._materialDefinitions[defIdx] ?? null;
}