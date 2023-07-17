export class Key {
  constructor(private collection: Collection, private value: string) {}

  toPath(sep: string = "/") {
    return `${this.collection.toPath()}${sep}${this.value}`;
  }
}

export class Collection {
  constructor(private path: string[]) {}

  collection(path: string) {
    return new Collection([...this.path, path]);
  }

  key(keyValue: string) {
    return new Key(this, keyValue);
  }

  toPath(sep: string = "/") {
    return `${this.path.join(sep)}`;
  }

  static collection(path: string) {
    return new Collection([path]);
  }
}

export abstract class DB {
  abstract getItem(key: Key): Promise<unknown>;
  abstract setItem(key: Key, value: unknown): Promise<void>;
  abstract deleteItem(key: Key, value: unknown): Promise<void>;
}
