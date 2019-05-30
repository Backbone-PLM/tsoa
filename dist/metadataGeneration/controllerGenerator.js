"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var decoratorUtils_1 = require("./../utils/decoratorUtils");
var customAttribute_1 = require("./customAttribute");
var exceptions_1 = require("./exceptions");
var methodGenerator_1 = require("./methodGenerator");
var security_1 = require("./security");
var template_1 = require("./template");
var typeResolver_1 = require("./typeResolver");
var ControllerGenerator = /** @class */ (function () {
    function ControllerGenerator(node, current) {
        this.node = node;
        this.current = current;
        this.path = this.getPath();
        this.tags = this.getTags();
        this.security = this.getSecurity();
        this.customMethodAttributes = this.getCustomMethodAttributes();
        this.template = this.getTemplate();
    }
    ControllerGenerator.prototype.IsValid = function () {
        return !!this.path || this.path === '';
    };
    ControllerGenerator.prototype.Generate = function () {
        if (!this.node.parent) {
            throw new exceptions_1.GenerateMetadataError('Controller node doesn\'t have a valid parent source file.');
        }
        if (!this.node.name) {
            throw new exceptions_1.GenerateMetadataError('Controller node doesn\'t have a valid name.');
        }
        var sourceFile = this.node.parent.getSourceFile();
        return {
            isHidden: this.getIsHidden(),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.path || '',
        };
    };
    ControllerGenerator.prototype.buildMethods = function () {
        var _this = this;
        var typeNode = this.current.typeChecker.getTypeAtLocation(this.node);
        var genericTypeMap = this.getResolvedGenericTypeMap(typeNode);
        // using ts.Type::getProperties() ensures all inherited methods are included
        var methods = typeNode.getProperties()
            .filter(function (m) { return m.valueDeclaration.kind === ts.SyntaxKind.MethodDeclaration; })
            .map(function (m) { return new methodGenerator_1.MethodGenerator(m.valueDeclaration, _this.current, _this.tags, _this.security, genericTypeMap); })
            .filter(function (generator) { return generator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
        methods.forEach(function (method) {
            var _a;
            var stringValueMap = new Map(_this.template);
            stringValueMap.set('PATH', method.path);
            stringValueMap.set('METHOD', method.method.toUpperCase());
            if (_this.path) {
                stringValueMap.set('ROUTE', _this.path);
            }
            (_a = method.customAttributes).push.apply(_a, _this.customMethodAttributes);
            method.customAttributes = _this.resolveCustomAttributes(method.customAttributes, stringValueMap);
            if (method.description) {
                method.description = _this.interpolateString(method.description, stringValueMap);
            }
        });
        return methods;
    };
    ControllerGenerator.prototype.getPath = function () {
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Route'; });
        if (!decorators || !decorators.length) {
            return;
        }
        if (decorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Route decorator allowed in '" + this.node.name.text + "' class.");
        }
        var decorator = decorators[0];
        var expression = decorator.parent;
        var decoratorArgument = expression.arguments[0];
        return decoratorArgument ? "" + decoratorArgument.text : '';
    };
    ControllerGenerator.prototype.getTags = function () {
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Tags'; });
        if (!decorators || !decorators.length) {
            return;
        }
        if (decorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Tags decorator allowed in '" + this.node.name.text + "' class.");
        }
        var decorator = decorators[0];
        var expression = decorator.parent;
        return expression.arguments.map(function (a) { return a.text; });
    };
    ControllerGenerator.prototype.getSecurity = function () {
        var securityDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Security'; });
        if (!securityDecorators || !securityDecorators.length) {
            return [];
        }
        return security_1.getSecurities(securityDecorators);
    };
    ControllerGenerator.prototype.getCustomMethodAttributes = function () {
        var customAttributeDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'CustomMethodAttribute'; });
        if (!customAttributeDecorators || !customAttributeDecorators.length) {
            return [];
        }
        return customAttribute_1.getCustomAttributes(customAttributeDecorators);
    };
    ControllerGenerator.prototype.getTemplate = function () {
        var templateDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Template'; });
        if (!templateDecorators || !templateDecorators.length) {
            return new Map();
        }
        if (templateDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Template decorator allowed in '" + this.node.name.text + "' class.");
        }
        return template_1.getTemplate(templateDecorators[0]);
    };
    // given a type, traverses any base classes (recursively) and creates a map of any
    // generic type parameters so that the TypeResolver can find them
    ControllerGenerator.prototype.getResolvedGenericTypeMap = function (typeNode) {
        var _this = this;
        // using a map of maps, where the top level keys represent the names of the base
        // classes and whose values are maps in the form of `typeT->resolvedDeclaration`.
        // this will allow the TypeResolver to correctly find, for example, that a generic
        // type parameter `T` defined on a nested base class method resolves to some model `Foo`,
        // because at the top of the inheritance chain the concrete class used `Foo` as `T`
        var genericTypeMap = new Map();
        var baseTypes = typeNode.getBaseTypes();
        if (baseTypes && baseTypes.length) {
            baseTypes.forEach(function (baseType) {
                var target = baseType.target;
                if (baseType.typeArguments && baseType.typeArguments.length) {
                    var baseTypeName = target.symbol.name;
                    // ensure a top level map entry for this base type
                    if (!genericTypeMap.has(baseTypeName)) {
                        genericTypeMap.set(baseTypeName, new Map());
                    }
                    var baseTypeMap_1 = genericTypeMap.get(baseTypeName);
                    if (baseTypeMap_1) {
                        // correlate by index
                        baseType.typeArguments.forEach(function (baseArg, index) {
                            if (target.typeParameters) {
                                var targetParam = target.typeParameters[index];
                                var targetParamName = targetParam.symbol ? targetParam.symbol.name : ts.TypeFlags[targetParam.flags];
                                var baseArgDeclaration = void 0;
                                if (baseArg.symbol &&
                                    baseArg.symbol.declarations.length &&
                                    typeResolver_1.TypeResolver.nodeIsUsable(baseArg.symbol.declarations[0])) {
                                    baseArgDeclaration = baseArg.symbol.declarations[0];
                                }
                                else {
                                    baseArgDeclaration = ts.TypeFlags[baseArg.flags];
                                }
                                baseTypeMap_1.set(targetParamName, baseArgDeclaration);
                            }
                        });
                        // recurse down the inheritance chain and then make one flattened map
                        var baseGenericMap = _this.getResolvedGenericTypeMap(target);
                        baseGenericMap.forEach(function (value, key) {
                            if (!genericTypeMap.has(key)) {
                                genericTypeMap.set(key, new Map());
                            }
                            var nestedBaseTypeMap = genericTypeMap.get(key);
                            if (nestedBaseTypeMap) {
                                value.forEach(function (resolvedDeclaration, genericTypeName) {
                                    // if type params (keys in the map) in the nested base types match a key
                                    // one level up, it ultimately means they should resolve to the same type
                                    var baseResolvedDeclaration = baseTypeMap_1.get(genericTypeName) || resolvedDeclaration;
                                    nestedBaseTypeMap.set(genericTypeName, baseResolvedDeclaration);
                                });
                            }
                        });
                    }
                }
            });
        }
        return genericTypeMap;
    };
    ControllerGenerator.prototype.interpolateString = function (initialString, stringValueMap) {
        var resolvedString = initialString;
        stringValueMap.forEach(function (val, key) {
            var regex = new RegExp("{\\$" + key + "}", 'g');
            resolvedString = resolvedString.replace(regex, val);
        });
        return resolvedString;
    };
    ControllerGenerator.prototype.resolveCustomAttributes = function (customAttributes, stringValueMap) {
        var _this = this;
        return customAttributes.map(function (customAttr) {
            var customAttrString = JSON.stringify(customAttr.value);
            var attributeValue = _this.interpolateString(customAttrString, stringValueMap);
            return { key: customAttr.key, value: JSON.parse(attributeValue) };
        });
    };
    ControllerGenerator.prototype.getIsHidden = function () {
        var hiddenDecorators = this.getDecoratorsByIdentifier(this.node, 'Hidden');
        if (!hiddenDecorators || !hiddenDecorators.length) {
            return false;
        }
        if (hiddenDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Hidden decorator allowed in '" + this.path + "' controller.");
        }
        return true;
    };
    ControllerGenerator.prototype.getDecoratorsByIdentifier = function (node, id) {
        return decoratorUtils_1.getDecorators(node, function (identifier) { return identifier.text === id; });
    };
    return ControllerGenerator;
}());
exports.ControllerGenerator = ControllerGenerator;
//# sourceMappingURL=controllerGenerator.js.map