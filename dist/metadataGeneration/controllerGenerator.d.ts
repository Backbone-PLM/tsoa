import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';
export declare class ControllerGenerator {
    private readonly node;
    private readonly current;
    private readonly path?;
    private readonly tags?;
    private readonly security?;
    private readonly customMethodAttributes;
    private readonly template;
    constructor(node: ts.ClassDeclaration, current: MetadataGenerator);
    IsValid(): boolean;
    Generate(): Tsoa.Controller;
    private buildMethods;
    private getPath;
    private getTags;
    private getSecurity;
    private getCustomMethodAttributes;
    private getTemplate;
    private getResolvedGenericTypeMap;
    private interpolateString;
    private resolveCustomAttributes;
    private getIsHidden;
    private getDecoratorsByIdentifier;
}
