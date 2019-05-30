"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var initializer_value_1 = require("./initializer-value");
function getCustomAttributes(decorators) {
    var customAttributes = decorators.map(function (customAttributeDecorator) {
        var expression = customAttributeDecorator.parent;
        var _a = expression.arguments, decoratorKeyArg = _a[0], decoratorValueArg = _a[1];
        if (decoratorKeyArg.kind !== ts.SyntaxKind.StringLiteral) {
            throw new Error('First argument of Custom Attribute must be the attribute key as a string');
        }
        var attributeKey = initializer_value_1.getInitializerValue(decoratorKeyArg);
        if (!decoratorValueArg) {
            throw new Error("Custom Attribute '" + attributeKey + "' must contain a value");
        }
        var attributeValue = initializer_value_1.getInitializerValue(decoratorValueArg);
        return { key: attributeKey, value: attributeValue };
    });
    return customAttributes;
}
exports.getCustomAttributes = getCustomAttributes;
//# sourceMappingURL=customAttribute.js.map