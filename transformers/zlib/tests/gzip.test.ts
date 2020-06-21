import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/x/std@v0.57.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.57.0/path/mod.ts";
import { encode } from "https://deno.land/std@v0.57.0/encoding/base64.ts";
import { GzEncoder, GzDecoder } from "../mod.ts";
import { TransformError } from "../../errors.ts";
import * as Transform from "../../../transform.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

async function validGunzip(decoder: GzDecoder) {
  const filePath = path.join(__dirname, "samples", "lorem.txt.gz");
  const expectedFile = path.join(__dirname, "samples", "lorem.txt");
  let file = await Deno.open(filePath, { read: true });
  // Encode file
  const result = await Deno.readAll(
    Transform.newReader(file, decoder),
  );
  file.close();

  assertEquals(
    await Deno.readFile(expectedFile),
    result,
  );
}

async function invalidGunzip(decoder: GzDecoder) {
  const filePath = path.join(__dirname, "samples", "lorem.txt");
  let file = await Deno.open(filePath, { read: true });
  const reader = Transform.newReader(
    file,
    new GzDecoder(),
  );

  await assertThrowsAsync(
    async () => await Deno.readAll(reader),
    TransformError,
    "Failed to Inflate with: Z_DATA_ERROR",
  );
  file.close();
}

Deno.test("gunzip file", async () => {
  await validGunzip(new GzDecoder());
});

Deno.test("GzDecoder: Invalid gzip", async () => {
  await invalidGunzip(new GzDecoder());
});

Deno.test("GzDecoder: Should reset correctly", async () => {
  const decoder = new GzDecoder();
  await invalidGunzip(decoder);
  // Pass same decoder that failed
  // newReader should call .reset
  await validGunzip(decoder);
  // Call again after success
  await validGunzip(decoder);
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
