export function curryFunction(func: Function, extraArgs: any[]) {
    return function (this: any, ...args: any[]) {
        return func.call(this, ...extraArgs, ...args);
    }
}
