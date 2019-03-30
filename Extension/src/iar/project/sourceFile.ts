/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

import * as Vscode from "vscode";
import * as Path from "path";
import * as Fs from "fs";
import { XmlNode } from "../../utils/XmlNode";

export interface SourceFile {
  readonly path: Fs.PathLike;
  readonly absolutePath: Fs.PathLike;
  readonly workspacePath: Fs.PathLike;
}

export class XmlSourceFile implements SourceFile {
  private xmlData: XmlNode;
  private projectPath: Fs.PathLike;

  constructor(xml: XmlNode, projectPath: Fs.PathLike) {
    this.projectPath = projectPath;

    if (xml.tagName !== "file") {
      throw new Error(
        "Expected an xml element 'file' instead of '" + xml.tagName + "'."
      );
    }

    let nameNode = xml.getFirstChildByName("name");
    if (nameNode == null) {
      throw new Error("Name node not present in file definition!");
    }

    this.xmlData = nameNode;
  }

  get path(): Fs.PathLike {
    let path = this.xmlData.text;

    if (path) {
      return path;
    } else {
      return "";
    }
  }

  get absolutePath(): Fs.PathLike {
    let fullPath = this.path
      .toString()
      .replace("$PROJ_DIR$", this.projectPath.toString());

    return Path.resolve(fullPath);
  }

  get workspacePath(): Fs.PathLike {
    if (
      Vscode.workspace.workspaceFolders &&
      Vscode.workspace.workspaceFolders.length > 0
    ) {
      return Path.relative(
        Vscode.workspace.workspaceFolders[0].uri.fsPath,
        this.absolutePath.toString()
      );
    } else {
      return this.absolutePath;
    }
  }
}

export namespace SourceFile {
  export function fromXmlData(
    xml: XmlNode,
    projectPath: Fs.PathLike
  ): SourceFile[] {
    let fileNodes = xml.getAllChildsByName("file");

    return fileNodes
      .map(node => {
        try {
          return new XmlSourceFile(node, projectPath);
        } catch (error) {
          return undefined;
        }
      })
      .filter(value => value != null)
      .map(value => value as SourceFile);
  }
}
