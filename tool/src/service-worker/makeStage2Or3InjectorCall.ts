import { type Statement, type Expression, type Property } from 'estree';

export function makeStage2Or3InjectorCall(instanceArgName: null | string, injectionID: number, passedNames: Iterable<string>): Statement {
    const contextProperties: Property[] = [];
    const callArgs: Expression[] = [
        {
            type: 'Literal',
            value: injectionID,
        },
    ];

    if (instanceArgName !== null) {
        callArgs.push(
            {
                type: 'Identifier',
                name: instanceArgName,
            },
        );
    }

    callArgs.push(
        {
            type: 'ObjectExpression',
            properties: contextProperties,
        },
    );

    for (const name of passedNames) {
        contextProperties.push({
            type: 'Property',
            kind: 'init',
            method: false,
            shorthand: true,
            computed: false,
            key: {
                type: 'Identifier',
                name,
            },
            value: {
                type: 'Identifier',
                name,
            },
        });
    }

    return {
        type: 'IfStatement',
        test: {
            type: 'MemberExpression',
            object: {
                type: 'Identifier',
                name: 'window',
            },
            property: {
                type: 'Identifier',
                name: 'wleTraceSWInjector',
            },
            computed: false,
            optional: false,
        },
        consequent: {
            type: 'BlockStatement',
            body: [
                {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'CallExpression',
                        optional: false,
                        callee: {
                            type: 'MemberExpression',
                            object: {
                                type: 'MemberExpression',
                                object: {
                                    type: 'Identifier',
                                    name: 'window',
                                },
                                property: {
                                    type: 'Identifier',
                                    name: 'wleTraceSWInjector',
                                },
                                computed: false,
                                optional: false,
                            },
                            property: {
                                type: 'Identifier',
                                name: instanceArgName !== null ? 'doPostInjection' : 'doPreInjection',
                            },
                            computed: false,
                            optional: false,
                        },
                        arguments: callArgs,
                    },
                },
            ],
        },
    };
}