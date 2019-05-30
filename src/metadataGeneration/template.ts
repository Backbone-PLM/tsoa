import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';

export function getTemplate(decorator: ts.Identifier): Map<string, string> {
    const expression = decorator.parent as ts.CallExpression;

    const [decoratorValueArg] = expression.arguments;

    if (!decoratorValueArg) {
      throw new Error(`Template decorators must contain a value`);
    }

    const attributeValue = getInitializerValue(decoratorValueArg);

    return new Map<string, string>(Object.entries(attributeValue));
}
