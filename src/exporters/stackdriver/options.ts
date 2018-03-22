import { ExporterOptions } from "../exporterOptions";

export class StackdriverOptions implements ExporterOptions {
    projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
    }
}