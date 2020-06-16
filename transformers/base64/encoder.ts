import { b64encode } from "./deps.ts";
import { concat } from "./util.ts";
import { Transformer } from "../../transform.ts";

type Writer = Deno.Writer;

export class Base64Encoder implements Transformer {
  #extra: Uint8Array | null = null;
  #encoder = new TextEncoder();

  #write = async (
    dst: Writer,
    chunk: Uint8Array,
  ): Promise<number> => {
    await Deno.writeAll(dst, this.#encoder.encode(b64encode(chunk)));
    return chunk.length;
  };

  #flush = async (dst: Writer): Promise<number> => {
    if (this.#extra) {
      // Flush remaining
      const chunk = this.#extra;
      this.#extra = null;
      return this.#write(dst, chunk);
    }
    return 0;
  };

  reset() {
    this.#extra = null;
  }

  async transform(
    src: Uint8Array,
    dst: Writer,
    atEOF: boolean,
  ): Promise<number | null> {
    if (atEOF) {
      return this.#flush(dst);
    }

    let chunk = src;
    if (this.#extra) {
      chunk = concat(this.#extra, chunk);
      this.#extra = null;
    }

    // 3 bytes are represented by 4 characters
    const remaining = chunk.length % 3;
    if (remaining !== 0) {
      // buffer remaining bytes
      this.#extra = chunk.slice(chunk.length - remaining);
      chunk = chunk.subarray(0, chunk.length - remaining);
    }

    if (chunk.length === 0) {
      return 0;
    }

    return this.#write(dst, chunk);
  }
}
