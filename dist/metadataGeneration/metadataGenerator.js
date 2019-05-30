"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mm = require("minimatch");
var ts = require("typescript");
var controllerGenerator_1 = require("./controllerGenerator");
var MetadataGenerator = /** @class */ (function () {
    function MetadataGenerator(entryFile, compilerOptions, ignorePaths) {
        this.ignorePaths = ignorePaths;
        this.nodes = new Array();
        this.referenceTypeMap = {};
        this.circularDependencyResolvers = new Array();
        this.program = ts.createProgram([entryFile], compilerOptions || {});
        this.typeChecker = this.program.getTypeChecker();
    }
    MetadataGenerator.prototype.IsExportedNode = function (node) { return true; };
    MetadataGenerator.prototype.Generate = function () {
        var _this = this;
        this.program.getSourceFiles().forEach(function (sf) {
            if (_this.ignorePaths && _this.ignorePaths.length) {
                for (var _i = 0, _a = _this.ignorePaths; _i < _a.length; _i++) {
                    var path = _a[_i];
                    if (mm(sf.fileName, path)) {
                        return;
                    }
                }
            }
            ts.forEachChild(sf, function (node) {
                _this.nodes.push(node);
            });
        });
        var controllers = this.buildControllers();
        this.circularDependencyResolvers.forEach(function (c) { return c(_this.referenceTypeMap); });
        return {
            controllers: controllers,
            referenceTypeMap: this.referenceTypeMap,
        };
    };
    MetadataGenerator.prototype.TypeChecker = function () {
        return this.typeChecker;
    };
    MetadataGenerator.prototype.AddReferenceType = function (referenceType) {
        if (!referenceType.refName) {
            return;
        }
        this.referenceTypeMap[referenceType.refName] = referenceType;
    };
    MetadataGenerator.prototype.GetReferenceType = function (refName) {
        return this.referenceTypeMap[refName];
    };
    MetadataGenerator.prototype.OnFinish = function (callback) {
        this.circularDependencyResolvers.push(callback);
    };
    MetadataGenerator.prototype.checkForDuplicateMethods = function (controllers) {
        var methodSet = new Set();
        controllers.forEach(function (controller) {
            controller.methods.forEach(function (_a) {
                var method = _a.method, path = _a.path;
                var methodIdentifier = method.toUpperCase() + " /" + controller.path + "/" + path;
                if (methodSet.has(methodIdentifier)) {
                    throw new Error("Duplicate method for path '" + methodIdentifier + "' was found");
                }
                methodSet.add(methodIdentifier);
            });
        });
    };
    MetadataGenerator.prototype.buildControllers = function () {
        var _this = this;
        var controllerGenerators = this.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.ClassDeclaration && _this.IsExportedNode(node); })
            .map(function (classDeclaration) { return new controllerGenerator_1.ControllerGenerator(classDeclaration, _this); });
        var validControllers = controllerGenerators
            .filter(function (controllerGenerator) { return controllerGenerator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
        this.checkForDuplicateMethods(validControllers);
        return validControllers;
    };
    return MetadataGenerator;
}());
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map