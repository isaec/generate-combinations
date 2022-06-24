# generate-combinations

Generate all combinations of an object from a description, with advanced type safety. `generate-combinations` supports javascript and typescript, with esm or commonjs style imports.

## installation

```bash
npm i -D generate-combinations
# or
yarn add -D generate-combinations
# or
pnpm i -D generate-combinations
```

## usage

```typescript
import {
  generate,
  one,
  optional,
  some,
} from "generate-combinations";

import type { QuoteData } from "./Quote";

// generate all combinations of a quote as described in a declarative api!
const testCases = generate<QuoteData>({
  type: "quote",
  entries: one([["body of the quote"], ["two entries", "for this quote"]]),
  by: optional("author"),
  from: optional("source")
})
```

## features

Advanced type safety - the `generate` is typed such that it will not create an object that does not conform to its generic.
```typescript
type Data = {
  data: string;
  optionalData?: string;
}

```

```typescript
generate<Data>({
  data: optional("hello"),
  // ^ type error is thrown because data cannot be undefined
  // optional is the combination of a data and the key data undefined
  optionalData: "world"
});
```

<details><summary>
  Expand to view type error
  </summary><p>

``` typescript
(property) data: string | Combination<string>
  Type 'Combination<string | typeof KeyValueUndefined>' is not assignable to type 'string | Combination<string>'.
    Type 'Combination<string | typeof KeyValueUndefined>' is not assignable to type 'Combination<string>'.
      Type 'string | typeof KeyValueUndefined' is not assignable to type 'string'.
        Type 'typeof KeyValueUndefined' is not assignable to type 'string'.ts(2322)
index.test.ts(22, 3): The expected type comes from property 'data' which is declared here on type 'GenerationTemplate<Data>'
```

</p></details>
