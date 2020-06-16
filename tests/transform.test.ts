import * as Transform from "../mod.ts";
import { assertEquals } from "https://deno.land/x/std@v0.57.0/testing/asserts.ts";

const { Base64Encoder, Base64Decoder } = Transform.Transformers;

Deno.test("Basic transformer", async () => {
  const transformer: Transform.Transformer = {
    async transform(
      src: Uint8Array,
      dst: Deno.Writer,
      atEOF: boolean,
    ): Promise<number> {
      const transformed = new TextEncoder().encode("a".repeat(src.length));
      await Deno.writeAll(dst, transformed);
      return transformed.length;
    },
  };

  const items = ["deno.land", "\n", "transformer"];
  const itemsReader: Deno.Reader = {
    async read(p): Promise<number | null> {
      const item = items.shift();

      if (!item) {
        return null;
      }

      const chunk = new TextEncoder().encode(item);
      p.set(chunk, 0);
      return chunk.length;
    },
  };

  const reader = Transform.newReader(
    itemsReader,
    transformer,
  );
  assertEquals(
    new TextDecoder().decode(await Deno.readAll(reader)),
    "a".repeat(21),
  );
});

Deno.test("Chain encode/decode base64", async () => {
  const inputs = ["deno.land", "a".repeat(1000), "deno\nland\n\r"];

  for (const input of inputs) {
    const buf = new TextEncoder().encode(input).buffer;
    const transform = Transform.chain(new Base64Encoder(), new Base64Decoder());
    const reader = Transform.newReader(new Deno.Buffer(buf), transform);
    const result = await Deno.readAll(reader);
    assertEquals(new TextDecoder().decode(result), input);
  }
});

Deno.test("Pipeline encode/decode base64", async () => {
  const inputs = ["deno.land", "a".repeat(1000), "deno\nland\n\r"];

  for (const input of inputs) {
    const buf = new TextEncoder().encode(input).buffer;
    const reader = Transform.pipeline(
      new Deno.Buffer(buf),
      new Base64Encoder(),
      new Base64Decoder(),
    );
    const result = await Deno.readAll(reader);
    assertEquals(new TextDecoder().decode(result), input);
  }
});

Deno.test("Pipeline.to encode/decode base64", async () => {
  const inputs = ["deno.land", "a".repeat(1000), "deno\nland\n\r"];

  for (const input of inputs) {
    const buf = new TextEncoder().encode(input).buffer;
    const writer = new Deno.Buffer();

    await Transform
      .pipeline(new Deno.Buffer(buf), new Base64Encoder(), new Base64Decoder())
      .to(writer);

    assertEquals(new TextDecoder().decode(writer.bytes()), input);
  }
});
