/**
 * @file 解析 interface 生成 schema
 */
import { resolve } from "path";

/**
 * https://github.com/3rd/tsdiagram/blob/master/src/lib/parser/Parser.ts
 *  const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ScriptTarget.Latest,
        lib: ["lib.esnext.d.ts"],
      },
    });
    const sourceFile = project.createSourceFile("source.ts", code);
 */

// 上面 sourceFile 就是解析结果了，可以 `getInterface` 这样调用

import {
  ClassDeclaration,
  ExpressionWithTypeArguments,
  InterfaceDeclaration,
  MethodDeclaration,
  MethodSignature,
  ModuleDeclaration,
  Project,
  PropertyDeclaration,
  PropertySignature,
  ScriptTarget,
  SourceFile,
  Type,
  TypeAliasDeclaration,
} from "ts-morph";
import ts from 'typescript';

console.log(ts);

export type ParsedInterface = {
  name: string;
  declaration: InterfaceDeclaration;
  extends: ExpressionWithTypeArguments[];
  properties: PropertySignature[];
  methods: MethodSignature[];
  members: (MethodSignature | PropertySignature)[];
};

export type ParsedTypeAlias = {
  name: string;
  declaration: TypeAliasDeclaration;
  type: Type;
};

export type ParsedClass = {
  name: string;
  declaration: ClassDeclaration;
  extends?: ExpressionWithTypeArguments;
  implements: ExpressionWithTypeArguments[];
  properties: (PropertyDeclaration | PropertySignature)[];
  methods: (MethodDeclaration | MethodSignature)[];
};

export class Parser {
  project: Project;
  sourceFile: SourceFile;

  constructor(code: string) {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ScriptTarget.Latest,
        lib: ["lib.esnext.d.ts"],
      },
    });
    const sourceFile = project.createSourceFile("source.ts", code);
    // sourceFile.saveSync();
    this.project = project;
    this.sourceFile = sourceFile;
  }

  setSource(code: string) {
    this.sourceFile.replaceWithText(code);
    // this.sourceFile.saveSync();
  }

  get fs() {
    return this.project.getFileSystem();
  }

  get source() {
    return this.sourceFile;
  }

  get checker() {
    return this.project.getTypeChecker();
  }

  get tsChecker() {
    return this.checker.compilerObject;
  }

  get children() {
    return this.source.getChildren();
  }

  get interfaces(): ParsedInterface[] {
    const result = new Map<
      string,
      {
        interface: ParsedInterface;
        propertyNames: Set<string>;
        methodNames: Set<string>;
      }
    >();
    const declarations: { declaration: InterfaceDeclaration; module: ModuleDeclaration | null }[] = this.source
      .getInterfaces()
      .map((declaration) => ({
        declaration,
        module: null,
      }));
    const declarationMembersMap = new Map<string, Set<string>>();

    for (const m of this.source.getModules()) {
      const moduleDeclarations = m.getInterfaces();
      declarations.push(...moduleDeclarations.map((declaration) => ({ declaration, module: m })));
    }

    for (const { module, declaration } of declarations) {
      const name = module ? `${module.getName()}.${declaration.getName()}` : declaration.getName();

      const declarationMembers = declarationMembersMap.get(name) ?? new Set<string>();
      for (const member of declaration.getProperties()) {
        declarationMembers.add(member.getName());
      }
      for (const member of declaration.getMethods()) {
        declarationMembers.add(member.getName());
      }
      declarationMembersMap.set(name, declarationMembers);

      const item = result.get(name) ?? {
        interface: {
          name,
          declaration,
          extends: [],
          properties: [],
          methods: [],
          members: [],
        },
        propertyNames: new Set(),
        methodNames: new Set(),
      };

      item.interface.extends.push(...declaration.getExtends());

      const checkerType = this.checker.getTypeAtLocation(declaration);
      if (!checkerType.isInterface()) continue;

      for (const property of checkerType.getProperties()) {
        const propertyName = property.getName();
        const valueDeclaration = property.getValueDeclaration();
        if (!valueDeclaration) continue;

        if (valueDeclaration.getKindName() === "PropertySignature") {
          if (item.propertyNames.has(propertyName)) {
            continue;
          }
          item.interface.properties.push(valueDeclaration as PropertySignature);
          item.interface.members.push(valueDeclaration as PropertySignature);
          item.propertyNames.add(propertyName);
        } else if (valueDeclaration.getKindName() === "MethodSignature") {
          if (item.methodNames.has(propertyName)) {
            continue;
          }
          item.interface.methods.push(valueDeclaration as MethodSignature);
          item.interface.members.push(valueDeclaration as MethodSignature);
          item.methodNames.add(propertyName);
        } else {
          // console.error("Unexpected interface property kind", valueDeclaration.getKindName());
        }
      }

      result.set(name, item);
    }

    // move declaration members after other members
    const items = Array.from(result.values()).map(({ interface: item }) => item);
    for (const item of items) {
      const declarationMembers = declarationMembersMap.get(item.name);
      if (!declarationMembers) continue;
      item.members.sort((a, b) => {
        const aName = a.getName();
        const bName = b.getName();
        if (declarationMembers.has(aName) && !declarationMembers.has(bName)) {
          return 1;
        } else if (!declarationMembers.has(aName) && declarationMembers.has(bName)) {
          return -1;
        }
        return 0;
      });
    }

    return items;
  }

  get typeAliases(): ParsedTypeAlias[] {
    const result: ParsedTypeAlias[] = [];
    const declarations: {
      declaration: TypeAliasDeclaration;
      module: ModuleDeclaration | null;
    }[] = this.source.getTypeAliases().map((declaration) => ({ declaration, module: null }));

    for (const m of this.source.getModules()) {
      const moduleDeclarations = m.getTypeAliases();
      declarations.push(...moduleDeclarations.map((declaration) => ({ declaration, module: m })));
    }

    for (const { declaration, module } of declarations) {
      const name = module ? `${module.getName()}.${declaration.getName()}` : declaration.getName();
      const type = declaration.getType();

      result.push({ name, declaration, type });
    }

    return result;
  }

  get classes(): ParsedClass[] {
    const result = new Map<
      string,
      {
        class: ParsedClass;
        propertyNames: Set<string>;
        methodNames: Set<string>;
      }
    >();
    const declarations: { declaration: ClassDeclaration; module: ModuleDeclaration | null }[] = this.source
      .getClasses()
      .map((declaration) => ({
        declaration,
        module: null,
      }));

    for (const m of this.source.getModules()) {
      const moduleDeclarations = m.getClasses();
      declarations.push(...moduleDeclarations.map((declaration) => ({ declaration, module: m })));
    }

    for (const { declaration, module } of declarations) {
      const name = module ? `${module.getName()}.${declaration.getName()}` : declaration.getName();
      if (!name) continue;

      const item = result.get(name) ?? {
        class: {
          name,
          declaration,
          extends: declaration.getExtends(),
          implements: declaration.getImplements(),
          properties: [],
          methods: [],
        },
        propertyNames: new Set(),
        methodNames: new Set(),
      };

      const checkerType = this.checker.getTypeAtLocation(declaration);

      for (const property of checkerType.getProperties()) {
        const propertyName = property.getName();
        const valueDeclaration = property.getValueDeclaration();
        if (!valueDeclaration) continue;

        if (
          valueDeclaration.getKindName() === "PropertySignature" ||
          valueDeclaration.getKindName() === "PropertyDeclaration"
        ) {
          if (item.propertyNames.has(propertyName)) continue;
          item.class.properties.push(valueDeclaration as PropertySignature);
          item.propertyNames.add(propertyName);
        } else if (
          valueDeclaration.getKindName() === "MethodSignature" ||
          valueDeclaration.getKindName() === "MethodDeclaration"
        ) {
          if (item.methodNames.has(propertyName)) continue;
          item.class.methods.push(valueDeclaration as MethodSignature);
          item.methodNames.add(propertyName);
        } else {
          // console.error("Unexpected class property kind", valueDeclaration.getKindName());
        }
      }

      result.set(name, item);
    }

    return Array.from(result.values()).map(({ class: item }) => item);
  }
}

function main() {
  const p = new Parser(`interface Person {
  name: string;
  age: number;
  sayHi(): void;
}
type Animal = {
  type: number;
}
function parse(person: { name: string; age: number }) {
  return {
    name: person.name,
    age: String(person.age),
    walk() {
      return true;
    },
  };
}
type PersonAlias = ReturnType<typeof parse>;
`);
  // console.log(p.interfaces);
  for (let i = 0; i < p.typeAliases.length; i += 1) {
    const alias = p.typeAliases[i];
    console.log(alias);
  }
}
// main();

function parse(person: { name: string; age: number }) {
  return {
    name: person.name,
    age: String(person.age),
    walk() {
      return true;
    },
  };
}
type PersonAlias = ReturnType<typeof parse>;
