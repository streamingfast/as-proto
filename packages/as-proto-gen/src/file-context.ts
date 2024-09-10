import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { GeneratorContext } from "./generator-context";
import { ScopeContext } from "./scope-context";
import * as assert from "assert";
import { getPathWithoutExtension } from "./names";

export class FileContext {
  private readonly filePath: string;
  private readonly moduleScopeContext: ScopeContext;
  private readonly generatorContext: GeneratorContext;
  private readonly fileDescriptor: FileDescriptorProto;
  private readonly registeredImports: Map<string, Map<string, string>> =
    new Map();
  private readonly registeredDefinitions: Set<string> = new Set();
  private readonly syntax:string;

  constructor(
    filePath: string,
    generatorContext: GeneratorContext,
    fileDescriptor: FileDescriptorProto,
    syntax: string
  ) {
    this.filePath = filePath;
    this.generatorContext = generatorContext;
    this.fileDescriptor = fileDescriptor;
    this.moduleScopeContext = new ScopeContext(this);
    this.syntax = syntax;
  }

  getFilePath(): string {
    return this.filePath;
  }

  getSyntax(): string {
    return this.syntax;
  }

  getGeneratorContext(): GeneratorContext {
    return this.generatorContext;
  }

  getFileDescriptor(): FileDescriptorProto {
    return this.fileDescriptor;
  }

  registerImport(importName: string, importPath: string): string {
    const normalizedImportPath = getPathWithoutExtension(importPath, ".ts");

    const importNames =
      this.registeredImports.get(normalizedImportPath) ||
      new Map<string, string>();
    const safeImportName =
      importNames.get(importName) ||
      this.moduleScopeContext.registerName(importName);

    importNames.set(importName, safeImportName);
    this.registeredImports.set(normalizedImportPath, importNames);

    return safeImportName;
  }

  registerDefinition(definitionName: string): string {
    if (!this.registeredDefinitions.has(definitionName)) {
      // we assume that definitions are registered before imports
      assert.ok(!this.moduleScopeContext.hasRegisteredName(definitionName));

      this.registeredDefinitions.add(definitionName);
      // reserve this name
      this.moduleScopeContext.registerName(definitionName);
    }

    return definitionName;
  }

  getImportsCode(): string {
    let importLines: string[] = [];
    for (const [importPath, importNames] of this.registeredImports) {
      const importFields: string[] = [];
      for (const [importName, safeImportName] of importNames) {
        const isAliased = importName !== safeImportName;
        importFields.push(
          isAliased ? `${importName} as ${safeImportName}` : `${importName}`
        );
      }
      importLines.push(
        `import { ${importFields.join(", ")} } from ${JSON.stringify(
          importPath
        )};`
      );
    }

    return importLines.join("\n");
  }
}
