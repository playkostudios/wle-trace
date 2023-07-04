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