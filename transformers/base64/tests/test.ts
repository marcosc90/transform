import { assertEquals } from "https://deno.land/x/std@v0.57.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.57.0/path/mod.ts";
import { encode } from "https://deno.land/std@v0.57.0/encoding/base64.ts";
import { Base64Decoder, Base64Encoder } from "../mod.ts";
import * as Transform from "../../../transform.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const testsetString = [
  ["", ""],
  ["f", "Zg=="],
  ["fo", "Zm8="],
  ["foo", "Zm9v"],
  ["foob", "Zm9vYg=="],
  ["fooba", "Zm9vYmE="],
  ["foobar", "Zm9vYmFy"],
  ["deno\n", "ZGVubwo="],
  ["deno\nland\n", "ZGVubwpsYW5kCg=="],
];

const stringCharReader = (string: string): Deno.Reader => {
  const encoder = new TextEncoder();
  const chars = Array.from(string);

  return {
    async read(p: Uint8Array): Promise<number | null> {
      const char = chars.shift();
      if (char === undefined) {
        return null;
      }
      const b = new Uint8Array([char.charCodeAt(0)]);

      p.set(b, 0);

      return b.length;
    },
  };
};

Deno.test("base64Encoder", async () => {
  for (const [input, output] of testsetString) {
    const reader = Transform.newReader(
      stringCharReader(input),
      new Base64Encoder(),
    );
    const result = await Deno.readAll(reader);
    assertEquals(new TextDecoder().decode(result), output);
  }
});

Deno.test("base64Decoder", async () => {
  for (const [input, output] of testsetString) {
    const reader = Transform.newReader(
      stringCharReader(output),
      new Base64Decoder(),
    );

    const result = await Deno.readAll(reader);
    assertEquals(new TextDecoder().decode(result), input);
  }
});

Deno.test("base64 file", async () => {
  const filePath = path.join(__dirname, "1x1.png");
  let file = await Deno.open(filePath, { read: true });
  // Encode file
  const result = await Deno.readAll(
    Transform.newReader(file, new Base64Encoder()),
  );
  file.close();

  assertEquals(
    encode(await Deno.readFile(filePath)),
    new TextDecoder().decode(result),
  );

  file = await Deno.open(filePath, { read: true });

  const reader = Transform.newReader(file, new Base64Encoder());

  const decoderReader = Transform.newReader(reader, new Base64Decoder());

  assertEquals(
    await Deno.readFile(filePath),
    await Deno.readAll(decoderReader),
  );
  file.close();
});
