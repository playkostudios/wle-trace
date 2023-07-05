type GenericClass = { new (...args: any[]): any };
type InstanceHandler<T> = (newInstance: T, args: any[]) => T | undefined;

const handlerMap = new WeakMap<GenericClass, InstanceHandler<unknown>>();

const constructHandler: ProxyHandler<GenericClass> = {
    construct(target, argArray, newTarget) {
        let newInstance = Reflect.construct(target, argArray, newTarget);
        const handler = handlerMap.get(target);
        if (handler) {
            const replacement = handler(newInstance, argArray);
            if (replacement) {
                newInstance = replacement;
            }
        }

        return newInstance;
    },
};

export function replaceScopedConstructor<T extends GenericClass>(scope: object, className: string, instanceHandler: InstanceHandler<InstanceType<T>>) {
    const scopeRecord = scope as Record<string, any>;
    const clazz = scopeRecord[className];
    if (clazz === undefined) {
        throw new Error(`Can't replace constructor; global class with name "${className}" not found`);
    }

    handlerMap.set(clazz, instanceHandler as InstanceHandler<unknown>);
    scopeRecord[className] = new Proxy(clazz, constructHandler);
}
