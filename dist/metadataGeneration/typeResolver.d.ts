import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
export declare class TypeResolver {
    private readonly typeNode;
    private readonly current;
    private readonly parentNode?;
    private readonly extractEnum;
    private readonly genericTypeMap?;
    static nodeIsUsable(node: ts.Node): boolean;
    constructor(typeNode: ts.TypeNode, current: MetadataGenerator, parentNode?: ts.Node | undefined, extractEnum?: boolean, genericTypeMap?: Map<string, Map<string, string | ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration>> | undefined);
    resolve(): Tsoa.Type;
    private getPrimitiveType;
    private getPrimitiveTypeByString;
    private getDateType;
    private getEnumerateType;
    private getLiteralType;
    private getReferenceType;
    private resolveGenericDeclarationFromMap;
    private resolvePrimitiveTypeFromMap;
    private resolveGenericTypeFromMap;
    private resolveFqTypeName;
    private getTypeName;
    private getAnyTypeName;
    private createCircularDependencyResolver;
    private nodeIsUsable;
    private resolveLeftmostIdentifier;
    private resolveModelTypeScope;
    private getModelTypeDeclaration;
    private getModelProperties;
    private getModelAdditionalProperties;
    private getModelInheritedProperties;
    private hasPublicModifier;
    private getNodeDescription;
    private getNodeFormat;
    private getNodeExample;
}
