import { ExporterOptions } from "../exporterOptions";

export class StackdriveOptions implements ExporterOptions {
    projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
    }
}