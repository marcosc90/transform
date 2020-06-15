# Deno Transformer

Based on [Golang Transformer](https://godoc.org/golang.org/x/text/transform?tab=doc#Transformer)


```ts
import * as Transform from "https://deno.land/x/transform";

const transformer: Transform.Transformer =  {
   reset() {},
   async transform(src: Uint8Array, dst: Deno.Writer, atEOF: boolean): Promise<number> {
       const transformed = new TextEncoder().encode("a".repeat(src.length));
       await Deno.writeAll(dst, transformed);
       return transformed.length;
   }
}

const file = await Deno.open('file.txt'); // deno.land
const reader = Transform.newReader(
    file,
    transformer
);
assertEquals(
    new TextDecoder().decode(await Deno.readAll(reader)),
    'DENO.LAND'
);
file.close()
```

## Built-in Transformers


### Base64

#### `Base64Decoder`
```ts
import * as Transform from "https://deno.land/x/transform";
const { Base64Decoder } = Transform.Transformers;

const input = await Deno.open('./image.b64', { read: true });
const output = await Deno.open('./image.png', { create: true, write: true });
const reader = Transform.newReader(input, new Base64Decoder());
await Deno.copy(reader, output);
input.close();
output.close();
```

#### `Base64Encoder`
```ts
import * as Transform from "https://deno.land/x/transform";
const { Base64Encoder } = Transform.Transformers;

const input = await Deno.open('./image.png', { read: true });
const output = await Deno.open('./image.b64', { create: true, write: true });
const reader = Transform.newReader(input, new Base64Encoder);
await Deno.copy(reader, output);
input.close();
output.close();
```

## Chaining Transformers

### `chain(...transformers: Transformer[])`
```ts
import * as Transform from "https://deno.land/x/transform";
const { Base64Decoder, Base64Encoder } = Transform.Transformers;

const expected = await Deno.readFile('./image.png');
const input = await Deno.open('./image.png', { read: true });

const transformer = Transform.chain(new Base64Encoder(), new Base64Decoder())
const reader = Transform.newReader(input, transformer);

assertEquals(expected,	await Deno.readAll(reader))
input.close();
```

### `pipeline(r: Reader, ...transformers: Transformer[])`

A wrapper around `Transformer.chain`

```ts
import * as Transform from "https://deno.land/x/transform";
const { Base64Decoder, Base64Encoder } = Transform.Transformers;

const expected = await Deno.readFile('./image.png');
const input = await Deno.open('./image.png', { read: true });
const output = await Deno.open('./image.b64', { read: true });

await Transform.pipeline(input, new Base64Encoder())
	.to(writer)

output.close();
input.close()
```