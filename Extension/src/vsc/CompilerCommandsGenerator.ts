/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

import * as Vscode from "vscode";
import * as Fs from "fs";
import * as Path from "path";
import * as equal from "fast-deep-equal";
import * as minimatch from "minimatch";
import { Config } from "../iar/project/config";
import { IncludePath } from "../iar/project/includepath";
import { PreIncludePath } from "../iar/project/preincludepath";
import { Define } from "../iar/project/define";
import { Compiler } from "../iar/tools/compiler";
import { FsUtils } from "../utils/fs";
import { Settings } from "../extension/settings";
import { Project } from "../iar/project/project";

export namespace CompilerCommandsGenerator {
  export function generate(
    project: Project,
    config: Config,
    compiler: Compiler,
    outPath?: Fs.PathLike
  ): Error | undefined {
    if (!Settings.getEnableCompilerCommandsGeneration()) {
      return new Error("Compile command generation is not enabled!");
    }

    if (!outPath) {
      outPath = createDefaultOutputPath(project.path);
    }

    let database = generateDatabase(config, compiler, project);

    let shouldWriteFile = true;

    if (Fs.existsSync(outPath) && Fs.statSync(outPath).isFile()) {
      let currentDatabase = JSON.parse(Fs.readFileSync(outPath).toString());

      if (equal(database, currentDatabase)) {
        shouldWriteFile = false;
      }
    }

    if (shouldWriteFile) {
      createOutDirectory(outPath);
      Fs.writeFileSync(outPath, JSON.stringify(database, undefined, 4));
    }

    return undefined;
  }

  function createDefaultOutputPath(projectPath: Fs.PathLike): Fs.PathLike {
    let projectFolderPath = Path.dirname(projectPath as string);
    let defaultPath = Path.join(projectFolderPath, "compile_commands.json");

    return defaultPath;
  }

  function getWorkspaceFolder(): Fs.PathLike {
    let workspaceFolder = Vscode.workspace.rootPath;

    if (!workspaceFolder) {
      throw new Error("No workspace folder opened.");
    }

    return workspaceFolder;
  }

  function definesToStringArray(defines: Define[]): string[] {
    return defines.map(d => `-D${d.identifier}=${d.value}`);
  }

  function includePathsToStringArray(includes: IncludePath[]): string[] {
    return includes.map(i => `-I${i.workspacePath}`);
  }

  function preIncludesToStringArray(preIncludes: PreIncludePath[]): string[] {
    return preIncludes.map(pi => `-include ${pi.workspaceRelativePath}`);
  }

  function getStandardForFile(file: Fs.PathLike): string {
    let fileAssociations = Vscode.workspace
      .getConfiguration("files")
      .get("associations") as { [pattern: string]: string };

    if (fileAssociations == null) {
      throw new Error("Could not get file associations!");
    }

    let fileAssociation: string | undefined = undefined;
    for (const pattern in fileAssociations) {
      if (minimatch(file as string, pattern)) {
        fileAssociation = fileAssociations[pattern];
        break;
      }
    }

    if (fileAssociation === undefined) {
      throw new Error(`Could not find language association for file: ${file}!`);
    }

    if (fileAssociation === "cpp") {
      return Settings.getCppStandard();
    } else if (fileAssociation === "c") {
      return Settings.getCStandard();
    } else {
      throw new Error(
        `Did not recognize associated language: ${fileAssociation}!`
      );
    }
  }

  function generateDatabase(
    config: Config,
    compiler: Compiler,
    project: Project
  ): any {
    let defines = definesToStringArray(
      config.defines.concat(compiler.defines)
    ).concat(Settings.getDefines());
    let includepaths = includePathsToStringArray(
      config.includes.concat(compiler.includePaths)
    );
    let preincludes = preIncludesToStringArray(config.preIncludes);
    let otherArguments = ["-nobuiltininc"];
    let args = defines
      .concat(includepaths)
      .concat(preincludes)
      .concat(otherArguments);

    let sourceFiles = project.sourceFiles;

    return sourceFiles.map(sf => {
      return {
        directory: getWorkspaceFolder(),
        file: sf.workspacePath,
        arguments: args.concat(`-std=${getStandardForFile(sf.workspacePath)}`)
      };
    });
  }

  function createOutDirectory(path: Fs.PathLike): void {
    let parsedPath = Path.parse(path.toString());

    if (parsedPath.dir) {
      FsUtils.mkdirsSync(parsedPath.dir);
    }
  }
}
