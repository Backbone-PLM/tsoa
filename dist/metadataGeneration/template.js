"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var initializer_value_1 = require("./initializer-value");
function getTemplate(decorator) {
    var expression = decorator.parent;
    var decoratorValueArg = expression.arguments[0];
    if (!decoratorValueArg) {
        throw new Error("Template decorators must contain a value");
    }
    var attributeValue = initializer_value_1.getInitializerValue(decoratorValueArg);
    return new Map(Object.entries(attributeValue));
}
exports.getTemplate = getTemplate;
//# sourceMappingURL=template.js.map