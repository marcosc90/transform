import pako from "./pako.js";
import { Transformer } from "https://deno.land/x/transform@v0.2.0/transform.ts";
import {
  deferred,
  Deferred,
} from "https://deno.land/std@0.57.0/async/deferred.ts";

type Writer = Deno.Writer;
type Buffer = Deno.Buffer;

class GzBase implements Transformer {
  #buffer?: Deno.Buffer;
  #end: Deferred<void> = deferred();
  #parser?: any;
  constructor(readonly type: string) {
    this.reset();
  }

  reset() {
    this.#buffer = new Deno.Buffer();
    // @ts-ignore
    this.#parser = new pako[this.type]({ gzip: true });
    this.#end = deferred();

    this.#parser.onData = async (chunk: any) => {
      Deno.writeAllSync(this.#buffer as Buffer, chunk);
    };

    this.#parser.onEnd = async (status: number) => {
      if (status === pako.Z_OK) {
        return this.#end.resolve();
      }

      return this.#end.reject();
    };
  }

  async transform(
    src: Uint8Array,
    dst: Writer,
    atEOF: boolean,
  ): Promise<number | null> {
    if (!atEOF && src.length === 0) {
      return 0;
    }

    if (atEOF) {
      this.#parser.push(src, true);
      await this.#end;
    } else {
      this.#parser.push(src, false);
    }

    return Deno.copy(this.#buffer as Buffer, dst);
  }
}

export class GzEncoder extends GzBase {
  constructor() {
    super("Deflate");
  }
}

export class GzDecoder extends GzBase {
  constructor() {
    super("Inflate");
  }
}
