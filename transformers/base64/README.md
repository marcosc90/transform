# Base64 Transformer

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