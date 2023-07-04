export enum ValueType {
    Uint32 = 0,
    Int32 = 1,
    Float32 = 2,
    Float64 = 3,
    Boolean = 4,
    String = 5,
    Pointer = 6,
    NullablePointer = 7,
    AttributeOffset = 8,
    AttributeStructPointer = 9,
    PointerFree = 10,
    PointerAlloc = 11,
    PointerAllocSize = 12,
    PointerAllocEnd = 13,
    PointerTemp = 14,
    Void = 15,
    PointerPreStart = 128,
    PointerPreEnd = 255,
};

export type MethodTypeMap = Map<number, ValueType[]>;

export enum ValueTypeJSON {
    Uint32 = 'u32',
    Int32 = 'i32',
    Float32 = 'f32',
    Float64 = 'f64',
    Boolean = 'bool',
    String = 'str',
    Pointer = 'ptr',
    NullablePointer = 'null_ptr',
    AttributeOffset = 'attr_off',
    AttributeStructPointer = 'attr_ptr',
    PointerFree = 'ptr_free',
    PointerAlloc = 'ptr_new',
    PointerAllocSize = 'ptr_new_size',
    PointerAllocEnd = 'ptr_new_end',
    PointerTemp = 'ptr_temp',
    PointerPrePrefix = 'ptr_pre_',
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