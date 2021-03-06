"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var indexOf = require("lodash.indexof");
var map = require("lodash.map");
var ts = require("typescript");
var jsDocUtils_1 = require("./../utils/jsDocUtils");
var validatorUtils_1 = require("./../utils/validatorUtils");
var exceptions_1 = require("./exceptions");
var initializer_value_1 = require("./initializer-value");
var syntaxKindMap = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';
var localReferenceTypeCache = {};
var inProgressTypes = {};
var TypeResolver = /** @class */ (function () {
    function TypeResolver(typeNode, current, parentNode, extractEnum, genericTypeMap) {
        if (extractEnum === void 0) { extractEnum = true; }
        this.typeNode = typeNode;
        this.current = current;
        this.parentNode = parentNode;
        this.extractEnum = extractEnum;
        this.genericTypeMap = genericTypeMap;
    }
    TypeResolver.nodeIsUsable = function (node) {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
                return true;
            default: return false;
        }
    };
    TypeResolver.prototype.resolve = function () {
        var primitiveType = this.getPrimitiveType(this.typeNode, this.parentNode);
        if (primitiveType) {
            return primitiveType;
        }
        if (this.typeNode.kind === ts.SyntaxKind.ArrayType) {
            return {
                dataType: 'array',
                elementType: new TypeResolver(this.typeNode.elementType, this.current).resolve(),
            };
        }
        if (this.typeNode.kind === ts.SyntaxKind.UnionType) {
            var unionType = this.typeNode;
            var supportType = unionType.types.some(function (type) { return type.kind === ts.SyntaxKind.LiteralType; });
            if (supportType) {
                return {
                    dataType: 'enum',
                    enums: unionType.types.map(function (type) {
                        var literalType = type.literal;
                        switch (literalType.kind) {
                            case ts.SyntaxKind.TrueKeyword: return 'true';
                            case ts.SyntaxKind.FalseKeyword: return 'false';
                            default: return String(literalType.text);
                        }
                    }),
                };
            }
            else {
                return { dataType: 'object' };
            }
        }
        if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword) {
            return { dataType: 'any' };
        }
        if (this.typeNode.kind === ts.SyntaxKind.TypeLiteral) {
            return { dataType: 'any' };
        }
        if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
            throw new exceptions_1.GenerateMetadataError("Unknown type: " + ts.SyntaxKind[this.typeNode.kind]);
        }
        var typeReference = this.typeNode;
        if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
            if (typeReference.typeName.text === 'Date') {
                return this.getDateType(this.parentNode);
            }
            if (typeReference.typeName.text === 'Buffer') {
                return { dataType: 'buffer' };
            }
            if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                return {
                    dataType: 'array',
                    elementType: new TypeResolver(typeReference.typeArguments[0], this.current, undefined, true, this.genericTypeMap).resolve(),
                };
            }
            if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                return new TypeResolver(typeReference.typeArguments[0], this.current, undefined, true, this.genericTypeMap).resolve();
            }
            if (typeReference.typeName.text === 'String') {
                return { dataType: 'string' };
            }
        }
        if (!this.extractEnum) {
            var enumType = this.getEnumerateType(typeReference.typeName, this.extractEnum);
            if (enumType) {
                return enumType;
            }
        }
        var literalType = this.getLiteralType(typeReference.typeName);
        if (literalType) {
            return literalType;
        }
        var primitiveFromGenericTypeName = this.resolvePrimitiveTypeFromMap(this.resolveFqTypeName(typeReference.typeName));
        if (primitiveFromGenericTypeName)
            return primitiveFromGenericTypeName;
        var referenceType;
        if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
            var typeT = typeReference.typeArguments;
            referenceType = this.getReferenceType(typeReference.typeName, this.extractEnum, typeT);
        }
        else {
            referenceType = this.getReferenceType(typeReference.typeName, this.extractEnum);
        }
        this.current.AddReferenceType(referenceType);
        return referenceType;
    };
    TypeResolver.prototype.getPrimitiveType = function (typeNode, parentNode) {
        var primitiveType = syntaxKindMap[typeNode.kind];
        if (!primitiveType) {
            return;
        }
        return this.getPrimitiveTypeByString(primitiveType, parentNode);
    };
    TypeResolver.prototype.getPrimitiveTypeByString = function (primitiveType, parentNode) {
        if (primitiveType === 'number') {
            if (!parentNode) {
                return { dataType: 'double' };
            }
            var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
                return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(function (m) { return m === name; });
            });
            if (tags.length === 0) {
                return { dataType: 'double' };
            }
            switch (tags[0]) {
                case 'isInt':
                    return { dataType: 'integer' };
                case 'isLong':
                    return { dataType: 'long' };
                case 'isFloat':
                    return { dataType: 'float' };
                case 'isDouble':
                    return { dataType: 'double' };
                default:
                    return { dataType: 'double' };
            }
        }
        return { dataType: primitiveType };
    };
    TypeResolver.prototype.getDateType = function (parentNode) {
        if (!parentNode) {
            return { dataType: 'datetime' };
        }
        var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
            return ['isDate', 'isDateTime'].some(function (m) { return m === name; });
        });
        if (tags.length === 0) {
            return { dataType: 'datetime' };
        }
        switch (tags[0]) {
            case 'isDate':
                return { dataType: 'date' };
            case 'isDateTime':
                return { dataType: 'datetime' };
            default:
                return { dataType: 'datetime' };
        }
    };
    TypeResolver.prototype.getEnumerateType = function (typeName, extractEnum) {
        if (extractEnum === void 0) { extractEnum = true; }
        var enumName = typeName.text;
        var enumNodes = this.current.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.EnumDeclaration; })
            .filter(function (node) { return node.name.text === enumName; });
        if (!enumNodes.length) {
            return;
        }
        if (enumNodes.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Multiple matching enum found for enum " + enumName + "; please make enum names unique.");
        }
        var enumDeclaration = enumNodes[0];
        function getEnumValue(member) {
            var initializer = member.initializer;
            if (initializer) {
                if (initializer.expression) {
                    return initializer.expression.text;
                }
                return initializer.text;
            }
            return;
        }
        if (extractEnum) {
            var enums = enumDeclaration.members.map(function (member, index) {
                return getEnumValue(member) || String(index);
            });
            return {
                dataType: 'refEnum',
                description: this.getNodeDescription(enumDeclaration),
                enums: enums,
                refName: enumName,
            };
        }
        else {
            return {
                dataType: 'enum',
                enums: enumDeclaration.members.map(function (member, index) {
                    return getEnumValue(member) || String(index);
                }),
            };
        }
    };
    TypeResolver.prototype.getLiteralType = function (typeName) {
        var literalName = typeName.text;
        var literalTypes = this.current.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.TypeAliasDeclaration; })
            .filter(function (node) {
            var innerType = node.type;
            return innerType.kind === ts.SyntaxKind.UnionType && innerType.types;
        })
            .filter(function (node) { return node.name.text === literalName; });
        if (!literalTypes.length) {
            return;
        }
        if (literalTypes.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Multiple matching enum found for enum " + literalName + "; please make enum names unique.");
        }
        var unionTypes = literalTypes[0].type.types;
        return {
            dataType: 'enum',
            enums: unionTypes.map(function (unionNode) { return unionNode.literal.text; }),
        };
    };
    TypeResolver.prototype.getReferenceType = function (type, extractEnum, genericTypes) {
        if (extractEnum === void 0) { extractEnum = true; }
        var typeName = this.resolveFqTypeName(type);
        var refNameWithGenerics = this.getTypeName(typeName, genericTypes);
        try {
            var existingType = localReferenceTypeCache[refNameWithGenerics];
            if (existingType) {
                return existingType;
            }
            // check the cache for fully resolved types from the generic map
            var resolvedGenericType = this.resolveGenericTypeFromMap(typeName);
            if (resolvedGenericType) {
                return resolvedGenericType;
            }
            var referenceEnumType = this.getEnumerateType(type, true);
            if (referenceEnumType) {
                localReferenceTypeCache[refNameWithGenerics] = referenceEnumType;
                return referenceEnumType;
            }
            if (inProgressTypes[refNameWithGenerics]) {
                return this.createCircularDependencyResolver(refNameWithGenerics);
            }
            inProgressTypes[refNameWithGenerics] = true;
            // if there is a matching Tsoa.UsableDeclaration entry in the generic map, use that
            var resolvedGenericDeclaration = this.resolveGenericDeclarationFromMap(typeName);
            var modelType = !resolvedGenericDeclaration || typeof resolvedGenericDeclaration === 'string'
                ? this.getModelTypeDeclaration(type)
                : resolvedGenericDeclaration;
            var properties = this.getModelProperties(modelType, genericTypes);
            var additionalProperties = this.getModelAdditionalProperties(modelType);
            var inheritedProperties = this.getModelInheritedProperties(modelType) || [];
            var example = this.getNodeExample(modelType);
            var referenceType = {
                additionalProperties: additionalProperties,
                dataType: 'refObject',
                description: this.getNodeDescription(modelType),
                properties: inheritedProperties,
                refName: refNameWithGenerics,
            };
            referenceType.properties = referenceType.properties.concat(properties);
            localReferenceTypeCache[refNameWithGenerics] = referenceType;
            if (example) {
                referenceType.example = example;
            }
            return referenceType;
        }
        catch (err) {
            // tslint:disable-next-line:no-console
            console.error("There was a problem resolving type of '" + this.getTypeName(typeName, genericTypes) + "'.");
            throw err;
        }
    };
    TypeResolver.prototype.resolveGenericDeclarationFromMap = function (typeName, typeNode) {
        if (typeNode === void 0) { typeNode = this.typeNode; }
        if (!this.genericTypeMap)
            return undefined;
        // traverse the syntax tree upwards until we find a class declaration that has an entry in the
        // passed in genericTypeMap, with a corresponding mapping of a generic template variable to a 
        // resolved type. if found, return it. if we hit the top of the tree without finding it, return
        // undefined
        if (typeNode.kind === ts.SyntaxKind.ClassDeclaration) {
            var baseClass = typeNode;
            if (baseClass && baseClass.name) {
                var baseClassMap = this.genericTypeMap.get(baseClass.name.text);
                if (baseClassMap) {
                    var resolvedTypeName = baseClassMap.get(typeName);
                    if (resolvedTypeName) {
                        return resolvedTypeName;
                    }
                }
            }
        }
        if (typeNode.parent) {
            return this.resolveGenericDeclarationFromMap(typeName, typeNode.parent);
        }
        return undefined;
    };
    TypeResolver.prototype.resolvePrimitiveTypeFromMap = function (typeName) {
        var resolvedTypeName = this.resolveGenericDeclarationFromMap(typeName);
        if (!resolvedTypeName || typeof resolvedTypeName !== 'string')
            return undefined;
        var primitiveKind = Object.values(syntaxKindMap).find(function (v) { return v.toLowerCase() === resolvedTypeName.toLowerCase(); });
        if (primitiveKind) {
            return this.getPrimitiveTypeByString(primitiveKind);
        }
        return undefined;
    };
    TypeResolver.prototype.resolveGenericTypeFromMap = function (typeName) {
        var resolvedTypeName = this.resolveGenericDeclarationFromMap(typeName);
        if (!resolvedTypeName)
            return undefined;
        var typeNameString = typeof resolvedTypeName === 'string'
            ? resolvedTypeName
            : resolvedTypeName.name.text;
        return localReferenceTypeCache[typeNameString];
    };
    TypeResolver.prototype.resolveFqTypeName = function (type) {
        if (type.kind === ts.SyntaxKind.Identifier) {
            var typeReference = type.parent;
            if (typeReference && typeReference.symbol) {
                return this.current.typeChecker.getFullyQualifiedName(typeReference.symbol).replace(/^("[^"]*"\.)?(.*)/, '$2');
            }
            return type.text;
        }
        var qualifiedType = type;
        return this.resolveFqTypeName(qualifiedType.left) + '.' + qualifiedType.right.text;
    };
    TypeResolver.prototype.getTypeName = function (typeName, genericTypes) {
        var _this = this;
        if (!genericTypes || !genericTypes.length) {
            var resolvedTypeName = this.resolveGenericDeclarationFromMap(typeName);
            if (!resolvedTypeName)
                return typeName;
            return typeof resolvedTypeName === 'string'
                ? resolvedTypeName
                : this.resolveFqTypeName(resolvedTypeName.name);
        }
        return typeName + genericTypes.map(function (t) { return _this.getAnyTypeName(t); }).join('');
    };
    TypeResolver.prototype.getAnyTypeName = function (typeNode) {
        var primitiveType = syntaxKindMap[typeNode.kind];
        if (primitiveType) {
            return primitiveType;
        }
        if (typeNode.kind === ts.SyntaxKind.ArrayType) {
            var arrayType = typeNode;
            return this.getAnyTypeName(arrayType.elementType) + '[]';
        }
        if (typeNode.kind === ts.SyntaxKind.UnionType) {
            return 'object';
        }
        if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
            throw new exceptions_1.GenerateMetadataError("Unknown type: " + ts.SyntaxKind[typeNode.kind] + ".");
        }
        var typeReference = typeNode;
        try {
            return typeReference.typeName.text;
        }
        catch (e) {
            // idk what would hit this? probably needs more testing
            // tslint:disable-next-line:no-console
            console.error(e);
            return typeNode.toString();
        }
    };
    TypeResolver.prototype.createCircularDependencyResolver = function (refName) {
        var referenceType = {
            dataType: 'refObject',
            refName: refName,
        };
        this.current.OnFinish(function (referenceTypes) {
            var realReferenceType = referenceTypes[refName];
            if (!realReferenceType) {
                return;
            }
            referenceType.description = realReferenceType.description;
            referenceType.properties = realReferenceType.properties;
            referenceType.dataType = realReferenceType.dataType;
            referenceType.refName = referenceType.refName;
        });
        return referenceType;
    };
    TypeResolver.prototype.nodeIsUsable = function (node) {
        return TypeResolver.nodeIsUsable(node);
    };
    TypeResolver.prototype.resolveLeftmostIdentifier = function (type) {
        while (type.kind !== ts.SyntaxKind.Identifier) {
            type = type.left;
        }
        return type;
    };
    TypeResolver.prototype.resolveModelTypeScope = function (leftmost, statements) {
        var _this = this;
        var _loop_1 = function () {
            var leftmostName = leftmost.kind === ts.SyntaxKind.Identifier
                ? leftmost.text
                : leftmost.right.text;
            var moduleDeclarations = statements
                .filter(function (node) {
                if (node.kind !== ts.SyntaxKind.ModuleDeclaration || !_this.current.IsExportedNode(node)) {
                    return false;
                }
                var moduleDeclaration = node;
                return moduleDeclaration.name.text.toLowerCase() === leftmostName.toLowerCase();
            });
            if (!moduleDeclarations.length) {
                throw new exceptions_1.GenerateMetadataError("No matching module declarations found for " + leftmostName + ".");
            }
            if (moduleDeclarations.length > 1) {
                throw new exceptions_1.GenerateMetadataError("Multiple matching module declarations found for " + leftmostName + "; please make module declarations unique.");
            }
            var moduleBlock = moduleDeclarations[0].body;
            if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) {
                throw new exceptions_1.GenerateMetadataError("Module declaration found for " + leftmostName + " has no body.");
            }
            statements = moduleBlock.statements;
            leftmost = leftmost.parent;
        };
        while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
            _loop_1();
        }
        return statements;
    };
    TypeResolver.prototype.getModelTypeDeclaration = function (type) {
        var _this = this;
        var leftmostIdentifier = this.resolveLeftmostIdentifier(type);
        var statements = this.resolveModelTypeScope(leftmostIdentifier, this.current.nodes);
        var typeName = type.kind === ts.SyntaxKind.Identifier
            ? type.text
            : type.right.text;
        var modelTypes = statements
            .filter(function (node) {
            if (!_this.nodeIsUsable(node) || !_this.current.IsExportedNode(node)) {
                return false;
            }
            var modelTypeDeclaration = node;
            var text = modelTypeDeclaration.name.text;
            return text === typeName;
        });
        if (!modelTypes.length) {
            throw new exceptions_1.GenerateMetadataError("No matching model found for referenced type " + typeName + ".");
        }
        if (modelTypes.length > 1) {
            // remove types that are from typescript e.g. 'Account'
            modelTypes = modelTypes.filter(function (modelType) {
                if (modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') > -1) {
                    return false;
                }
                return true;
            });
            /**
             * Model is marked with '@tsoaModel', indicating that it should be the 'canonical' model used
             */
            var designatedModels = modelTypes.filter(function (modelType) {
                var isDesignatedModel = jsDocUtils_1.isExistJSDocTag(modelType, function (tag) { return tag.tagName.text === 'tsoaModel'; });
                return isDesignatedModel;
            });
            if (designatedModels.length > 0) {
                if (designatedModels.length > 1) {
                    throw new exceptions_1.GenerateMetadataError("Multiple models for " + typeName + " marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.");
                }
                modelTypes = designatedModels;
            }
        }
        if (modelTypes.length > 1) {
            var conflicts = modelTypes.map(function (modelType) { return modelType.getSourceFile().fileName; }).join('"; "');
            throw new exceptions_1.GenerateMetadataError("Multiple matching models found for referenced type " + typeName + "; please make model names unique. Conflicts found: \"" + conflicts + "\".");
        }
        return modelTypes[0];
    };
    TypeResolver.prototype.getModelProperties = function (node, genericTypes) {
        var _this = this;
        var isIgnored = function (e) {
            var ignore = jsDocUtils_1.isExistJSDocTag(e, function (tag) { return tag.tagName.text === 'ignore'; });
            return ignore;
        };
        // Interface model
        if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            var interfaceDeclaration = node;
            return interfaceDeclaration.members
                .filter(function (member) {
                var ignore = isIgnored(member);
                return !ignore && member.kind === ts.SyntaxKind.PropertySignature;
            })
                .map(function (member) {
                var propertyDeclaration = member;
                var identifier = propertyDeclaration.name;
                if (!propertyDeclaration.type) {
                    throw new exceptions_1.GenerateMetadataError("No valid type found for property declaration.");
                }
                // Declare a variable that can be overridden if needed
                var aType = propertyDeclaration.type;
                // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
                if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {
                    // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                    var typeParams = map(node.typeParameters, function (typeParam) {
                        return typeParam.name.text;
                    });
                    // I am not sure in what cases
                    var typeIdentifier = aType.typeName;
                    var typeIdentifierName = void 0;
                    // typeIdentifier can either be a Identifier or a QualifiedName
                    if (typeIdentifier.text) {
                        typeIdentifierName = typeIdentifier.text;
                    }
                    else {
                        typeIdentifierName = typeIdentifier.right.text;
                    }
                    // I could not produce a situation where this did not find it so its possible this check is irrelevant
                    var indexOfType = indexOf(typeParams, typeIdentifierName);
                    if (indexOfType >= 0) {
                        aType = genericTypes[indexOfType];
                    }
                }
                return {
                    default: jsDocUtils_1.getJSDocComment(propertyDeclaration, 'default'),
                    description: _this.getNodeDescription(propertyDeclaration),
                    format: _this.getNodeFormat(propertyDeclaration),
                    name: identifier.text,
                    required: !propertyDeclaration.questionToken,
                    type: new TypeResolver(aType, _this.current, aType.parent).resolve(),
                    validators: validatorUtils_1.getPropertyValidators(propertyDeclaration),
                };
            });
        }
        // Type alias model
        if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            var aliasDeclaration = node;
            var properties_1 = [];
            if (aliasDeclaration.type.kind === ts.SyntaxKind.IntersectionType) {
                var intersectionTypeNode = aliasDeclaration.type;
                intersectionTypeNode.types.forEach(function (type) {
                    if (type.kind === ts.SyntaxKind.TypeReference) {
                        var typeReferenceNode = type;
                        var modelType = _this.getModelTypeDeclaration(typeReferenceNode.typeName);
                        var modelProps = _this.getModelProperties(modelType);
                        properties_1.push.apply(properties_1, modelProps);
                    }
                });
            }
            if (aliasDeclaration.type.kind === ts.SyntaxKind.TypeReference) {
                var typeReferenceNode = aliasDeclaration.type;
                var modelType = this.getModelTypeDeclaration(typeReferenceNode.typeName);
                var modelProps = this.getModelProperties(modelType);
                properties_1.push.apply(properties_1, modelProps);
            }
            return properties_1;
        }
        // Class model
        var classDeclaration = node;
        var properties = classDeclaration.members
            .filter(function (member) {
            var ignore = isIgnored(member);
            return !ignore;
        })
            .filter(function (member) { return member.kind === ts.SyntaxKind.PropertyDeclaration; })
            .filter(function (member) { return _this.hasPublicModifier(member); });
        var classConstructor = classDeclaration
            .members
            .find(function (member) { return member.kind === ts.SyntaxKind.Constructor; });
        if (classConstructor && classConstructor.parameters) {
            var constructorProperties = classConstructor.parameters
                .filter(function (parameter) { return _this.hasPublicModifier(parameter); });
            properties.push.apply(properties, constructorProperties);
        }
        return properties
            .map(function (property) {
            var identifier = property.name;
            var typeNode = property.type;
            if (!typeNode) {
                var tsType = _this.current.typeChecker.getTypeAtLocation(property);
                typeNode = _this.current.typeChecker.typeToTypeNode(tsType);
            }
            if (!typeNode) {
                throw new exceptions_1.GenerateMetadataError("No valid type found for property declaration.");
            }
            var type = new TypeResolver(typeNode, _this.current, property).resolve();
            return {
                default: initializer_value_1.getInitializerValue(property.initializer, type),
                description: _this.getNodeDescription(property),
                format: _this.getNodeFormat(property),
                name: identifier.text,
                required: !property.questionToken && !property.initializer,
                type: type,
                validators: validatorUtils_1.getPropertyValidators(property),
            };
        });
    };
    TypeResolver.prototype.getModelAdditionalProperties = function (node) {
        if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            var interfaceDeclaration = node;
            var indexMember = interfaceDeclaration
                .members
                .find(function (member) { return member.kind === ts.SyntaxKind.IndexSignature; });
            if (!indexMember) {
                return undefined;
            }
            var indexSignatureDeclaration = indexMember;
            var indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type, this.current).resolve();
            if (indexType.dataType !== 'string') {
                throw new exceptions_1.GenerateMetadataError("Only string indexers are supported.");
            }
            return new TypeResolver(indexSignatureDeclaration.type, this.current).resolve();
        }
        return undefined;
    };
    TypeResolver.prototype.getModelInheritedProperties = function (modelTypeDeclaration) {
        var _this = this;
        var properties = [];
        if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            return [];
        }
        var heritageClauses = modelTypeDeclaration.heritageClauses;
        if (!heritageClauses) {
            return properties;
        }
        heritageClauses.forEach(function (clause) {
            if (!clause.types) {
                return;
            }
            clause.types.forEach(function (t) {
                var baseEntityName = t.expression;
                var referenceType = _this.getReferenceType(baseEntityName);
                if (referenceType.properties) {
                    referenceType.properties.forEach(function (property) { return properties.push(property); });
                }
            });
        });
        return properties;
    };
    TypeResolver.prototype.hasPublicModifier = function (node) {
        return !node.modifiers || node.modifiers.every(function (modifier) {
            return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
        });
    };
    TypeResolver.prototype.getNodeDescription = function (node) {
        var symbol = this.current.typeChecker.getSymbolAtLocation(node.name);
        if (!symbol) {
            return undefined;
        }
        /**
         * TODO: Workaround for what seems like a bug in the compiler
         * Warrants more investigation and possibly a PR against typescript
         */
        if (node.kind === ts.SyntaxKind.Parameter) {
            // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
            symbol.flags = 0;
        }
        var comments = symbol.getDocumentationComment(this.current.typeChecker);
        if (comments.length) {
            return ts.displayPartsToString(comments);
        }
        return undefined;
    };
    TypeResolver.prototype.getNodeFormat = function (node) {
        return jsDocUtils_1.getJSDocComment(node, 'format');
    };
    TypeResolver.prototype.getNodeExample = function (node) {
        var example = jsDocUtils_1.getJSDocComment(node, 'example');
        if (example) {
            return JSON.parse(example);
        }
        else {
            return undefined;
        }
    };
    return TypeResolver;
}());
exports.TypeResolver = TypeResolver;
//# sourceMappingURL=typeResolver.js.map