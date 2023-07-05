export const NO_RET_BITMASK = 2;

export enum EventType {
    Callback = 0,
    Call = 1,
    NoRetCallback = Callback | NO_RET_BITMASK, // error thrown, therefore no return value
    NoRetCall = Call | NO_RET_BITMASK, // error thrown, therefore no return value
    MultiDMA = 4,
    IndexDMAu8 = 5,
    IndexDMAu16 = 6,
    IndexDMAu32 = 7,
    IndexDMAi8 = 8,
    IndexDMAi16 = 9,
    IndexDMAi32 = 10,
    IndexDMAf32 = 11,
    IndexDMAf64 = 12,
};