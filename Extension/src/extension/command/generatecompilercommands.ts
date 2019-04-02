/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use strict';

import * as Vscode from "vscode";
import { CommandBase } from "./command";
import { CompilerListModel } from "../model/selectcompiler";
import { ConfigurationListModel } from "../model/selectconfiguration";
import { CompilerCommandsGenerator } from "../../vsc/CompilerCommandsGenerator";
import { ProjectListModel } from "../model/selectproject";
import { Settings } from "../settings";

class GenerateCompilerCommandsCommand extends CommandBase {
    private compilerModel: CompilerListModel;
    private configModel: ConfigurationListModel;
    private projectModel : ProjectListModel;

    constructor(compilerModel: CompilerListModel, configModel: ConfigurationListModel, projectModel: ProjectListModel) {
        super("iar.generateCompilerCommands");

        this.compilerModel = compilerModel;
        this.configModel = configModel;
        this.projectModel = projectModel;

        this.compilerModel.addOnSelectedHandler(this.automaticExecution, this);
        this.configModel.addOnSelectedHandler(this.automaticExecution, this);
        this.projectModel.addOnSelectedHandler(this.automaticExecution, this);
    }

    automaticExecution(): void {
        if (!Settings.getEnableCompilerCommandsGeneration()) {
          return;
        }

        this.executeImpl();
    }

    executeImpl(): void {
        if (this.projectModel.selected == null
            || this.configModel.selected == null
            || this.compilerModel.selected == null)
        {
            return;
        }

        let result = CompilerCommandsGenerator.generate(
          this.projectModel.selected,
          this.configModel.selected,
          this.compilerModel.selected
        );

        if (result) {
            Vscode.window.showErrorMessage(result.message);
        }
    }
}

export namespace Command {
    export function createGenerateCompilerCommands(compilerModel: CompilerListModel, configModel: ConfigurationListModel, projectModel: ProjectListModel) {
        return new GenerateCompilerCommandsCommand(
          compilerModel,
          configModel,
          projectModel
        );
    }
}
