import * as YAML from "yaml";
import z from "zod";

export class DBValidationDocument<Schema extends z.Schema> {
  constructor(readonly document: YAML.Document, readonly shape: Schema) {
  }
}
