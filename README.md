# generate-combinations

Generate all combinations of an object from a description, with advanced type safety. `generate-combinations` supports javascript and typescript, with esm or commonjs style imports. No dependencies,and easy to extend. Ergonomic and declarative API. MIT Licensed.

Ideal for snapshot unit testing. Use `test.each` to generate a test case for each object, and expect your output to match a snapshot. With a few lines, you can detect a change to the output of your unit for any valid input data.

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

import { QuoteData, Quote } from "./Quote";

// generate all combinations of a quote as described in a declarative api!
const testCases = generate<QuoteData>({
  type: "quote",
  entries: one([["body of the quote"], ["two entries", "for this quote"]]),
  by: optional("author"),
  from: optional("source")
})

// vitest + solidjs syntax, but generate would work with any js and test framework
it.each(testCases)(`rendering %s matches snapshot`, (data) => {
  const { unmount, container } = render(() => <Quote data={data} />);
  expect(container).toMatchSnapshot();
  unmount();
});
```

## features

Advanced type safety - the `generate` function is typed such that it will not create an object that does not conform to its generic.

If you can make `generate` create data that does not conform to its generic without usage of `illegal` or similar ts assertions - its a bug! Please report it!

```typescript
type Data = {
  data: string;
  optionalData?: string;
}
```

<details><summary>
  Expand to view type error for snippet below.
  </summary><p>

> ``` typescript
> (property) data: string | Combination<string>
>   Type 'Combination<string | typeof KeyValueUndefined>' is not assignable to type 'string | Combination<string>'.
>     Type 'Combination<string | typeof KeyValueUndefined>' is not assignable to type 'Combination<string>'.
>       Type 'string | typeof KeyValueUndefined' is not assignable to type 'string'.
>         Type 'typeof KeyValueUndefined' is not assignable to type 'string'.ts(2322)
> README.md: The expected type comes from property 'data' which is declared here on type 'GenerationTemplate<Data>'
> ```

</p></details>

```typescript
generate<Data>({
  data: optional("hello"),
  // ^ typescript errors because data cannot be undefined
  // optional is the combination of a data and the key data undefined
  optionalData: "world",
});
```

```typescript
generate<Data>({
  data: "hello",
  optionalData: optional("world"),
  // ^ this is type safe because optionalData is optional
});
```

Produces all combinations of your description of an object.

```typescript
generate<Data>({
  data: one(["hello", "hey", "hi"]),
  optionalData: optional("world"),
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

While easily supporting advanced custom combination types.

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

Supports nesting of generate calls.

```typescript
type DataNest = {
  val: string;
  nested: {
    val: string;
    otherVal?: number;
  };
};
```

```typescript
generate<NestData>({
  val: one(["yo", "hey"]),
  nested: generate.nest<NestData["nested"]>({
    val: one(["str", "other str"]),
    otherVal: optional(5),
  }),
})
```

And maintains its type safety even when nested.

<details><summary>
  Expand to view type error for snippet below.
  </summary><p>

> ```typescript
> (property) val: string | Combination<string>
> Type 'Combination<string | number>' is not assignable to type 'string | Combination<string>'.
>   Type 'Combination<string | number>' is not assignable to type 'Combination<string>'.
>     Type 'string | number' is not assignable to type 'string'.
>       Type 'number' is not assignable to type 'string'.ts(2322)
> README.md: The expected type comes from property 'val' which is declared here on type 'GenerationTemplate<{ val: string; otherVal?: number | undefined; }>'
> ```

</p></details>

```typescript
generate<DataNest>({
  val: one(["yo", "hey"]),
  nested: generate.nest<DataNest["nested"]>({
    val: one(["str", 43]),
    // ^ typescript is angry because val cannot be a number
    otherVal: optional(5),
  }),
});
```

While also offering an escape hatch from the otherwise safe type system to allow you to create invalid test data - your input data won't always conform to your types, so why should your test data?

<details><summary>
Note that using <code>illegal</code> can have unexpected implications.
  </summary><p>

> ```typescript
> const illegal = <T, R>(combination: Combination<T>): Combination<R> =>
>   combination as unknown as Combination<R>;
> ```
> 
> This means `'R' could be instantiated with an arbitrary type which could be unrelated to 'T'.` per `ts(2352)`
> 
> ```typescript
> generate<{
>   key: string[];
> }>({
>   key: illegal(one([1, 2, 3])),
>   // ^ illegal<number, string[]>(combination: Combination<number>): Combination<string[]>
>   // typescript will not be alarmed about this
> });
> ```
> 
> In this example, key will be instantiated with one of `[1, 2, 3]` even though `key: string[]`.
> This will almost certainly throw a a runtime error.
> By using `illegal`, you are telling TS not to worry about the type of this key.

</p></details>


```typescript
generate<{
  key: string;
}>({
  key: illegal(optional("value"))
  // ^ illegal<string | typeof KeyValueUndefined, string>(combination: Combination<string | typeof KeyValueUndefined>): Combination<string>
});
```

## ⚠️ **Beware Combinatorial explosion**

The following innocuous looking code will produce just over a million (`1_048_576`) combinations. `generate` can spit it out in just a few ms (~230 ms on my machine in deno), but your unit test, test framework, and test runner will likely buckle under the pressure.

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

## Contributing

Contributions welcome. If a new general purpose `Combination` is needed, please open an issue or pull request. Permutations were intentionally left out of this library to avoid combinatorial explosion - they are so rarely intentional.

If you can break the typing of `generate` please open an issue with code example.

MIT License.
