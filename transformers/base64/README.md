# Base64 Transformer

### `Base64Decoder`
```ts
const input = await Deno.open('./image.b64', { read: true });
const output = await Deno.open('./image.png', { create: true, write: true });
Deno.copy(base64Decoder(input), output);
```

### `Base64Encoder`
```ts
const input = await Deno.open('./image.png', { read: true });
const output = await Deno.open('./image.b64', { create: true, write: true });
Deno.copy(base64Encoder(input), output);
```