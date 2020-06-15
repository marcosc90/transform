import { concat } from "./util.ts";
import { Transformer } from "../../transform.ts";

type Writer = Deno.Writer;

// deno-fmt-ignore
const decodeChars = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
  -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
  -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
]

// Decoder adapted from: https://github.com/hapijs/b64/blob/master/lib/decoder.js
const b64decode = function (buffer: Uint8Array): Uint8Array {
  const len = buffer.length;
  const allocated = Math.ceil(len / 4) * 3;
  const result = new Uint8Array(allocated);

  let c1;
  let c2;
  let c3;
  let c4;
  let j = 0;

  for (let i = 0; i < len;) {
    do {
      c1 = decodeChars[buffer[i++] & 0xff];
    } while (i < len && c1 === -1);

    if (c1 === -1) {
      break;
    }

    do {
      c2 = decodeChars[buffer[i++] & 0xff];
    } while (i < len && c2 === -1);

    if (c2 === -1) {
      break;
    }

    result[j++] = (c1 << 2) | ((c2 & 0x30) >> 4);

    do {
      c3 = buffer[i++] & 0xff;
      if (c3 === 61) { // =
        return result.subarray(0, j);
      }

      c3 = decodeChars[c3];
    } while (i < len && c3 === -1);

    if (c3 === -1) {
      break;
    }

    result[j++] = ((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2);

    do {
      c4 = buffer[i++] & 0xff;
      if (c4 === 61) { // =
        return result.subarray(0, j);
      }

      c4 = decodeChars[c4];
    } while (i < len && c4 === -1);

    if (c4 !== -1) {
      result[j++] = ((c3 & 0x03) << 6) | c4;
    }
  }

  return (j === allocated ? result : result.subarray(0, j));
};

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
  ): Promise<number> {
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

    chunk = b64decode(chunk);
    await Deno.writeAll(
      dst,
      chunk,
    );
    return chunk.length;
  }
}
