import { type CallExpression } from 'estree';

export function isWasmInstantiateCall(expr: CallExpression): boolean {
    // matches *.*()?
    const callee1 = expr.callee;
    if (callee1.type !== 'MemberExpression') {
        return false;
    }

    // matches *.then()?
    const rightSubExpr = callee1.property;
    if (!(rightSubExpr.type === 'Identifier' && rightSubExpr.name === 'then')) {
        return false;
    }

    // matches *().then()?
    const leftSubExpr = callee1.object;
    if (leftSubExpr.type !== 'CallExpression') {
        return false;
    }

    // matches *.*().then()?
    const callee2 = leftSubExpr.callee;
    if (callee2.type !== 'MemberExpression') {
        return false;
    }

    // matches WebAssembly.instantiate().then()?
    return callee2.object.type === 'Identifier' && callee2.object.name === 'WebAssembly' && callee2.property.type === 'Identifier' && callee2.property.name === 'instantiate';
}