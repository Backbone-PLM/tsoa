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
    MetadataGenerator.prototype.getInheritedMethods = function (controller, controllerList) {
        var _this = this;
        var inheritedClasses = controllerList.filter(function (_a) {
            var name = _a.name;
            return controller.inheritanceList.includes(name);
        });
        var methods = inheritedClasses.reduce(function (acc, item) { return acc.concat(item.methods); }, []);
        return inheritedClasses.reduce(function (acc, item) { return acc.concat(_this.getInheritedMethods(item, controllerList)); }, methods);
    };
    MetadataGenerator.prototype.buildControllers = function () {
        var _this = this;
        var controllerGenerators = this.nodes
            .filter(function (node) { return node.kind === ts.SyntaxKind.ClassDeclaration && _this.IsExportedNode(node); })
            .map(function (classDeclaration) { return new controllerGenerator_1.ControllerGenerator(classDeclaration, _this); });
        // Need a list of all controllers with decorated methods for determining heritage on valid controllers.
        var allControllers = controllerGenerators.map(function (generator) { return generator.Generate(); });
        var validControllers = controllerGenerators
            .filter(function (controllerGenerator) { return controllerGenerator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
        // Attach all decorated methods, including those on parent classes, to the controller.
        // Reverse the array so that children with the same decorated method will overwrite the parent method.
        validControllers.forEach(function (controller) {
            var _a;
            return (_a = controller.methods).push.apply(_a, _this.getInheritedMethods(controller, allControllers));
        });
        return validControllers;
    };
    return MetadataGenerator;
}());
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map