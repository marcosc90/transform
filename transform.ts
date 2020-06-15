type Reader = Deno.Reader;
type Writer = Deno.Writer;

// Based on https://godoc.org/golang.org/x/text/transform?tab=doc#Transformer

const DEFAULT_BUFFER_SIZE = 1024 * 32;

export interface Transformer {
  transform(
    src: Uint8Array,
    dst: Writer,
    atEOF: boolean,
  ): Promise<number>;

  // Reset resets the state and allows a Transformer to be reused
  reset(): void;
}

export function chain(...transformers: Transformer[]): Transformer {
  return {
    reset(): void {
      for (let t of transformers) {
        t.reset();
      }
    },

    async transform(
      src: Uint8Array,
      dst: Writer,
      atEOF: boolean,
    ): Promise<number> {
      let buffer = new Deno.Buffer();
      let chunk = src;
      let n = 0;
      for (let i = 0; i < transformers.length; i++) {
        const t = transformers[i];
        let writer = i === transformers.length - 1 ? dst : buffer;
        n = await t.transform(chunk, writer, atEOF);
        chunk = buffer.bytes();
        buffer = new Deno.Buffer();
      }
      return n;
    },
  };
}

export function newReader(r: Reader, t: Transformer): Reader {
  t.reset();
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

interface Pipeline {
  to(dst: Writer): Promise<number>;
}

export function pipeline(
  r: Reader,
  ...transformers: Transformer[]
): Reader & Pipeline {
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
