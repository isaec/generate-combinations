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

Advanced type safety - the `generate` function is typed such that it will not create an object that does not conform to its generic.
```typescript
type Data = {
  data: string;
  optionalData?: string;
}

```

<details><summary>
  Expand to view type error for snippet below.
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

```typescript
generate<Data>({
  data: optional("hello"),
  // ^ typescript errors because data cannot be undefined
  // optional is the combination of a data and the key data undefined
  optionalData: "world"
});
```

```typescript
generate<Data>({
  data: "hello",
  optionalData: optional("world")
  // ^ this is type safe because optionalData is optional
});
```

Produces all combinations of your description of an object.

```typescript
generate<Data>({
  data: one(["hello", "hey", "hi"]),
  optionalData: optional("world")
});
```

```js
[
  { data: 'hello', optionalData: 'world' },
  { data: 'hey', optionalData: 'world' },
  { data: 'hi', optionalData: 'world' },
  { data: 'hello' },
  { data: 'hey' },
  { data: 'hi' }
]
```

Easily supports custom combination types.

```typescript
const upperAndLowerCase = (string: string): Combination<string> =>
  new Combination([string, string.toUpperCase(), string.toLowerCase()]);

generate<{
  str: string;
  num: number;
}>({
  str: upperAndLowerCase("Wow!"),
  num: one([1, 2, 3]),
});
```

```js
[
  { str: 'Wow!', num: 1 },
  { str: 'WOW!', num: 1 },
  { str: 'wow!', num: 1 },
  { str: 'Wow!', num: 2 },
  { str: 'WOW!', num: 2 },
  { str: 'wow!', num: 2 },
  { str: 'Wow!', num: 3 },
  { str: 'WOW!', num: 3 },
  { str: 'wow!', num: 3 }
]
```

## note: Beware Combinatorial explosion

The following innocuous looking code will produce over a million (`1_048_576`) combinations. `generate` can spit it out in just a few ms, but your unit test, test framework, and test runner will likely buckle under the pressure.

```typescript
generate<{}>({
  a: some([1, 2, 3, 4]),
  b: some([1, 2, 3, 4]),
  c: some([1, 2, 3, 4]),
  d: some([1, 2, 3, 4]),
  e: some([1, 2, 3, 4]),
})
```

The reasons for this are twofold

- `some` produces a *lot* of combinations

  ```typescript
  some([1, 2, 3])
  // is the combination:
  [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
  ```
  
- generate returns the combination of *every* combination it is supplied
  - in the explosive example, it needs to return every combination of every some combination

Usually, you will want to use `one` or `optional` instead of `some` to limit the number of combinations - `some` will produce combinations you are not interested in testing.
