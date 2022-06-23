import { expect, it, describe } from "vitest";
import {
  arrayCombinate,
  generate,
  generateTemplate,
  one,
  optional,
  some,
  Value,
} from ".";

const genTest = <T extends Record<string, Value>>(
  obj: generateTemplate<T>,
  log?: boolean
) => [obj, generate<T>(obj, log)];

it.each([
  genTest({
    a: some([1, 2]),
    c: 6,
  }),
  genTest<{
    a: number[];
    l?: number;
    b: number;
    c: number;
  }>({
    a: some([1, 2]),
    l: optional(5),
    b: 10,
    c: 6,
  }),
  genTest<{
    one: number;
    optional?: 5;
  }>({
    one: one([1, 2]),
    optional: optional(5),
  }),
  genTest<{
    a: Array<number>;
    b: Array<number | null>;
  }>({
    a: some([1, 2]),
    b: some([null, 5]),
  }),
  genTest<{
    fnOrUndefined: (() => number) | undefined;
    b: number;
  }>({
    fnOrUndefined: one([() => 5, () => 6, undefined]),
    b: 5,
  }),
  // doc comment tests below
  genTest<{
    id: string;
    key: string[];
  }>({
    id: "some" /* this is needed because the combinations look the same to the snapshot otherwise */,
    key: some(["a", "b", "c"]),
  }),
  genTest<{
    id: string;
    key: string;
  }>({
    id: "one",
    key: one(["a value", "another value"]),
  }),
  genTest<{
    id: string;
    key?: string;
  }>({
    id: "optional",
    key: optional("value"),
  }),
])(`matches snapshots for %s`, (_template, generateObject) => {
  expect(generateObject).toMatchSnapshot();
});

it.each([
  [
    /* input */ [1, 2, 3],
    /* output */ [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]],
  ],
  [/* input */ [1], /* output */ [[], [1]]],
  [
    /* input */ [],
    /* output */ [
      [
        /* one empty array */
      ],
    ],
  ],
])(`arrayCombinate(%s) === %s`, (array, expected) => {
  expect(arrayCombinate(array)).toEqual(expected);
});

// 1048576 combinations
// console.log(
//   generate<{}>({
//     a: some([1, 2, 3, 4]),
//     b: some([1, 2, 3, 4]),
//     c: some([1, 2, 3, 4]),
//     d: some([1, 2, 3, 4]),
//     e: some([1, 2, 3, 4]),
//   }).length
// );
