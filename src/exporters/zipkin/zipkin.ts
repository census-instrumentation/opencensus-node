import { Exporter } from "../exporter";
import { ZipkinOptions } from "./options";

export class Zipkin implements Exporter {
    constructor(options: ZipkinOptions) {
        throw new Error("Method not implemented.");
    }
    emit() {
        throw new Error("Method not implemented.");
    }
    generateTraceId(): string {
        throw new Error("Method not implemented.");
    }
    generateSpanId(): string {
        throw new Error("Method not implemented.");
    }
    generateSpanName(): string {
        throw new Error("Method not implemented.");
    }
}