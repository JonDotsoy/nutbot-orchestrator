import * as YAML from "yaml";
import * as fs from "node:fs/promises";
import { DB, Key } from "./db";

export class LocalDB extends DB {
  constructor(
    private base: URL = new URL(`../../.db/`, new URL(import.meta.url)),
  ) {
    super();
  }

  async getItem(key: Key): Promise<YAML.Document | null> {
    const destination = new URL(key.toPath(), this.base);
    try {
      return YAML.parseDocument(
        new TextDecoder().decode(await fs.readFile(destination)),
      );
    } catch (ex) {
      if (
        typeof ex === "object" && ex !== null &&
        Reflect.get(ex, "code") === "ENOENT"
      ) {
        return null;
      }
      throw ex;
    }
  }

  async setItem(key: Key, value: YAML.Document): Promise<void> {
    const destination = new URL(key.toPath(), this.base);
    await fs.mkdir(new URL("./", destination), { recursive: true });
    await fs.writeFile(destination, new TextEncoder().encode(value.toString()));
  }

  async deleteItem(key: Key): Promise<void> {
    const destination = new URL(key.toPath(), this.base);
    await fs.unlink(destination);
  }
}
