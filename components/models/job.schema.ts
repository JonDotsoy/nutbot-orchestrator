import * as YAML from "yaml";
import { z } from "zod";
import { DBValidationDocument } from "../integration/DBDocument";

export enum Status {
  pending = "pending",
  success = "success",
  rejected = "rejected",
}

const statusSchema = z.nativeEnum(Status);
export const JobSchema = z.object({
  id: z.string(),
  status: statusSchema,
  workflowId: z.string(),
  createdAt: z.string().datetime(),
  ack: z.optional(z.string().datetime()),
});

export type Job = z.infer<typeof JobSchema>;

export class JobDocument extends DBValidationDocument<typeof JobSchema> {
  constructor(document: YAML.Document) {
    super(document, JobSchema);
  }

  setInString(path: string[], value: string) {
    const scalar = new YAML.Scalar(value);
    this.document.setIn(path, scalar);
  }

  setInOptionalString(path: string[], value: string | undefined) {
    const scalar = new YAML.Scalar(value);
    this.document.setIn(path, scalar);
  }

  getInAsOptionalString(path: string[]) {
    const scalar = this.document.getIn(path, true);
    if (YAML.isScalar(scalar) && typeof scalar.value === "string") {
      return scalar.value;
    }
  }

  getInAsString(path: string[]) {
    const value = this.getInAsOptionalString(path);
    if (!value) throw new Error(`value ${path} is undefined`);
    return value;
  }

  set id(value: string) {
    this.setInString(["id"], value);
  }
  set status(value: Status) {
    this.setInString(["status"], value);
  }
  set workflowId(value: string) {
    this.setInString(["workflowId"], value);
  }
  set createdAt(value: string) {
    this.setInString(["createdAt"], value);
  }
  set ack(value: string | undefined) {
    this.setInOptionalString(["ack"], value);
  }

  get id() {
    return this.getInAsString(["id"]);
  }
  get status() {
    return statusSchema.parse(this.getInAsString(["status"]));
  }
  get ack() {
    return this.getInAsOptionalString(["ack"]);
  }

  toDocument() {
    return this.document;
  }

  toJS() {
    const data = this.document.toJS();
    return JobSchema.parse(data);
  }
}
