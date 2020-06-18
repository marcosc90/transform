import { assertEquals } from "https://deno.land/x/std@v0.57.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.57.0/path/mod.ts";
import { encode } from "https://deno.land/std@v0.57.0/encoding/base64.ts";
import { GzEncoder, GzDecoder } from "../mod.ts";
import * as Transform from "../../../transform.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

Deno.test("gunzip file", async () => {
  const filePath = path.join(__dirname, "samples", "lorem.txt.gz");
  const expectedFile = path.join(__dirname, "samples", "lorem.txt");
  let file = await Deno.open(filePath, { read: true });
  // Encode file
  const result = await Deno.readAll(
    Transform.newReader(file, new GzDecoder()),
  );
  file.close();

  assertEquals(
    await Deno.readFile(expectedFile),
    result,
  );
});

Deno.test("gzip/gunzip", async () => {
  const filePath = path.join(__dirname, "samples", "lorem.txt");
  let file = await Deno.open(filePath, { read: true });

  const transformer = Transform.chain(new GzEncoder(), new GzDecoder());
  const result = await Deno.readAll(
    Transform.newReader(file, transformer),
  );
  file.close();

  assertEquals(
    await Deno.readFile(filePath),
    result,
  );
});
