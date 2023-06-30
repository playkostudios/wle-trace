export enum ValueType {
    Uint32 = 0,
    Int32 = 1,
    Float32 = 2,
    Float64 = 4,
    Pointer = 5,
    Boolean = 6,
    String = 7,
};

export enum SpecialRetType {
    Void = 255,
};

export const VALUE_TYPE_MAX = 7;
export const SPECIAL_TYPE_MIN = 255;

export type ArgType = ValueType;
export type RetType = SpecialRetType | ValueType;
export type AnyType = ArgType | RetType;
export type MethodTypeMap = Map<number, AnyType[]>;

export enum ValueTypeJSON {
    Uint32 = 'u32',
    Int32 = 'i32',
    Float32 = 'f32',
    Float64 = 'f64',
    Pointer = 'ptr',
    Boolean = 'bool',
    String = 'str',
}

export interface CallTypeJSON {
    args: Array<ValueTypeJSON>;
    ret?: ValueTypeJSON;
};

export interface MethodTypeMapsJSON {
    version: 1;
    calls?: Record<string, CallTypeJSON>;
    callbacks?: Record<string, CallTypeJSON>;
};

// 0x00DF"WLET" in ASCII; Demo File WLE-Trace
export const MAGIC = new Uint8Array([ 0x00,0xDF,0x57,0x4C,0x45,0x54 ]);
export const REPLAY_FORMAT_VERSION = 1;
export const MAX_REPLAY_FORMAT_VERSION = 1;