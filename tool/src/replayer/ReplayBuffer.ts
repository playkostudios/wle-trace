export interface ReplayBuffer {
    readonly ended: boolean;
    continue(): boolean;
    markCallbackAsReplayed(methodName: string, args: unknown[]): unknown;
    registerLooseEndCallback(callback: () => void): void;
}