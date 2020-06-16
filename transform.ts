type Reader = Deno.Reader;
type Writer = Deno.Writer;

// Based on https://godoc.org/golang.org/x/text/transform?tab=doc#Transformer

const DEFAULT_BUFFER_SIZE = 1024 * 32;

export interface Transformer {
  // transform writes to dst the transformed bytes read from src, and
  // returns the number of dst bytes written. The
  // atEOF argument tells whether src represents the last bytes of the
  // input, all internal data must be written to dst at that point.
  transform(
    src: Uint8Array,
    dst: Writer,
    atEOF: boolean,
  ): Promise<number | null>;

  // reset resets the state and allows a Transformer to be reused
  reset?(): void;
}

interface Target {
  to(dst: Writer): Promise<number>;
}

/* Returns a `Transformer` that applies `t` in sequence. */
export function chain(...transformers: Transformer[]): Transformer {
  return {
    reset(): void {
      for (let t of transformers) {
        if (typeof t.reset === "function") {
          t.reset();
        }
      }
    },

    async transform(
      src: Uint8Array,
      dst: Writer,
      atEOF: boolean,
    ): Promise<number | null> {
      let buffer = new Deno.Buffer();
      let chunk = src;
      let n: number | null = 0;

      for (let i = 0; i < transformers.length; i++) {
        const t = transformers[i];
        const last = i === transformers.length - 1;
        let writer = last ? dst : buffer;
        n = await t.transform(chunk, writer, atEOF);
        if (n === null) {
          return null;
        }
        if (!last) {
          chunk = buffer.bytes();
          buffer = new Deno.Buffer();
        }
      }

      return n;
    },
  };
}

/* Returns a new `Reader` that wraps `r` by transforming the bytes read via `t`. It calls `t.reset()` */
export function newReader(r: Reader, t: Transformer): Reader {
  if (typeof t.reset === "function") {
    t.reset();
  }

  const buffer = new Deno.Buffer();
  const src = new Uint8Array(DEFAULT_BUFFER_SIZE);
  let atEOF = false;

  return {
    async read(p: Uint8Array): Promise<number | null> {
      if (buffer.empty()) {
        if (atEOF) {
          return null;
        }

        const n = await r.read(src);
        atEOF = n === null;

        const dstN = await t.transform(
          src.subarray(0, n || 0),
          buffer,
          atEOF,
        );

        if (dstN === 0) {
          return 0;
        }

        if (dstN === null) {
          return null;
        }
      }

      return buffer.read(p);
    },
  };
}

/* A wrapper around `Transformer.chain` & `Transformer.newReader` */
export function pipeline(
  r: Reader,
  ...transformers: Transformer[]
): Reader & Target {
  const transformer = chain(...transformers);
  const reader = newReader(r, transformer);

  return {
    async read(p: Uint8Array): Promise<number | null> {
      return reader.read(p);
    },

    to(dst: Writer): Promise<number> {
      return Deno.copy(this, dst);
    },
  };
}
