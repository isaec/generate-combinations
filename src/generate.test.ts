import { expect, it, describe } from "vitest";
import {
  generate,
  generateTemplate,
  one,
  optional,
  some,
  Value,
} from "./generate";

generate<{
  opt?: number;
  required: number;
  alsoOptional?: number[] | string;
  numberArray?: Array<1 | 2 | 3> | "test";
}>({
  opt: optional(1),
  required: one([5, 6]),
  alsoOptional: optional([1]),
  numberArray: some([1, 2, 3]),
});

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
])(`matches snapshots for %s`, (_template, generateObject) => {
  expect(generateObject).toMatchSnapshot();
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
