import { concat } from "./util.ts";
import { Transformer } from "../../transform.ts";
import { b64Decode } from "./deps.ts";
import { TransformError } from "../errors.ts";

type Writer = Deno.Writer;

export class Base64Decoder implements Transformer {
  #extra: Uint8Array | null = null;
  #decoder = new TextDecoder();

  reset() {
    this.#extra = null;
  }

  async transform(
    src: Uint8Array,
    dst: Writer,
    atEOF: boolean,
  ): Promise<number | null> {
    let chunk = this.#extra ? concat(this.#extra, src) : src;

    // 4 characters represent 3 bytes
    const remaining = chunk.length % 4;

    if (remaining !== 0) {
      this.#extra = chunk.slice(chunk.length - remaining);
      chunk = chunk.subarray(0, chunk.length - remaining);
    } else {
      this.#extra = null;
    }

    if (chunk.length === 0) {
      return 0;
    }

    try {
      chunk = b64Decode(chunk);
    } catch {
      // RuntimeError from WASM
      throw new TransformError("Invalid base64 input");
    }

    await Deno.writeAll(
      dst,
      chunk,
    );
    return chunk.length;
  }
}
