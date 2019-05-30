import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
export declare class MethodGenerator {
    private readonly node;
    private readonly current;
    private readonly parentTags?;
    private readonly parentSecurity?;
    private readonly genericTypeMap?;
    private method;
    private path;
    constructor(node: ts.MethodDeclaration, current: MetadataGenerator, parentTags?: string[] | undefined, parentSecurity?: Tsoa.Security[] | undefined, genericTypeMap?: Map<string, Map<string, string | ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration>> | undefined);
    IsValid(): boolean;
    Generate(): Tsoa.Method;
    private buildParameters;
    private getCustomAttributes;
    private getCurrentLocation;
    private processMethodDecorators;
    private getMethodResponses;
    private getMethodSuccessResponse;
    private getMethodSuccessExamples;
    private supportsPathMethod;
    private getExamplesValue;
    private getOperationId;
    private getTags;
    private getIsHidden;
    private getSecurity;
    private getDecoratorsByIdentifier;
}
