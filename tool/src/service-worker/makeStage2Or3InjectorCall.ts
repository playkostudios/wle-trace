import { type Statement, type Property, type Expression } from 'estree';

export function makeStage2Or3InjectorCall(isStage3: boolean, instanceOrImportsArgName: string, injectionID: number, passedNames: Iterable<string>): Statement {
    const contextProperties: Property[] = [];
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

    let statementExpression: Expression = {
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
                name: isStage3 ? 'doPostInjection' : 'doPreInjection',
            },
            computed: false,
            optional: false,
        },
        arguments: [
            {
                type: 'Literal',
                value: injectionID,
            },
            {
                type: 'Identifier',
                name: instanceOrImportsArgName,
            },
            {
                type: 'ObjectExpression',
                properties: contextProperties,
            },
        ],
    };

    if (isStage3) {
        statementExpression = {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
                type: 'Identifier',
                name: instanceOrImportsArgName,
            },
            right: statementExpression,
        };
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
                    expression: statementExpression
                },
            ],
        },
    };
}