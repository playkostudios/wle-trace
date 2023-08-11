const asyncStartRegex = /^\s*(async)?\s*/;
const functionStartRegex = /^\s*(async)?\s*function[\s(*]/;

export function parseFunction(func: Function): FunctionExpression {
    let inCode = func.toString();

    // if code is a method instead of a function, which is invalid code on its
    // if it's from a method definition inside of a class instead of a
    // prototype function definition, then turn it into a function expression
    if (!functionStartRegex.test(inCode)) {
        const match = asyncStartRegex.exec(inCode);
        if (match !== null) {
            // async method
            inCode = `${match[0]}function ${inCode.substring(match.index + match[0].length)}`;
        } else {
            // non-async method
            inCode = `function ${inCode}`;
        }
    }

    // parse
    const result = parseExpressionAt(inCode, 0, { ecmaVersion: 'latest', ranges: false });

    if (result.type !== 'FunctionExpression') {
        throw new Error('Method parsed into an AST node that is not a FunctionExpression');
    }

    const ast = result as unknown as FunctionExpression;

    // make sure everything after the parsed expression is whitespaces
    const codeEnd = inCode.length;
    for (let i = result.end; i < codeEnd; i++) {
        if (!/\s/g.test(inCode[i])) {
            throw new Error('Junk after function expression');
        }
    }

    return ast;
}
