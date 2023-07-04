export function replaceGlobalConstructor(className: string, ctor: (origClass: any, args: any[]) => any) {
    const globalRecord = globalThis as unknown as Record<string, any>;
    const clazz = globalRecord[className];
    if (clazz === undefined) {
        throw new Error('TODO');
    }

    const newCtor = function (this: any, ...args: any[]){
        return ctor.call(this, clazz, args)
    };
    newCtor.prototype = clazz.prototype;
    newCtor.prototype.constructor = newCtor;
    globalRecord[className] = newCtor;
}
