import { execPath } from "process";

/**
 * The legal types of a template.
 */
export type Value =
  | string
  | number
  | {
      [key: string]: Value;
    }
  | Value[]
  | null
  | undefined
  | Function;

/**
 * An empty object, that represents the scenario when a key should not be defined.
 * {@link generateTemplate} will allow this in positions where a key is optionally defined.
 * This is ***different*** from the union of undefined.
 * ```
 * {
 *   requiredKey: number | undefined, // this key must be defined, but can be defined as undefined
 *   optionalKey?: number,            // this key may be left undefined
 * }
 * ```
 * If you want a combination including the value undefined, simply use the value undefined.
 * {@link KeyValueUndefined} is only legal in the `optionalKey?` position, not the `requiredKey` position.
 * The distinction is small, but it is the difference between:
 * ```
 * // the key is instantiated as undefined
 * const obj1 = { requiredKey: undefined };
 * // the key is not defined at all
 * const obj2 = {};
 *      // ^ this is a type error in TS if the type of obj2 is { requiredKey: number | undefined }
 * ```
 *
 * @see {@link generate}
 * @see {@link generateTemplate}
 */
export class KeyValueUndefined {}

/**
 * Checks if `Value | Combination` union type is a `Combination` type using `instanceof`
 */
export const isKeyValueUndefined = (
  data: KeyValueUndefined | Value
): data is KeyValueUndefined => data instanceof KeyValueUndefined;

/**
 * The class (and return type) of functions that generate uses to produce combinations.
 * The {@link Combination.values} thunk should return an array of all combinations of the operation when called.
 */
export class Combination<T> {
  values: () => Array<T>;
  constructor(values: () => ReturnType<Combination<T>["values"]>) {
    this.values = values;
  }
}

type CombinationKeyValues<T> = [
  keyof T & string,
  Array<Value | KeyValueUndefined>
];

/**
 * Checks if `Value | Combination` union type is a `Combination` type using `instanceof`
 */
export const isCombination = <T>(data: any): data is Combination<T> =>
  data instanceof Combination;

// https://codereview.stackexchange.com/questions/7001/generating-all-combinations-of-an-array
/**
 * Returns an array with every combination of the keys of the passed array - not every ordering (permutation) is returned.
 *
 * ``arrayCombinate([1, 2, 3])`` returns
 * ```
 * [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
 * ```
 * Notice how it contains every *combination* of the array, not every permutation.
 *
 * This function powers the {@link some} combination.
 */
export const arrayCombinate = <T extends Value>(
  array: T[]
): Array<Array<T>> => {
  const resultStack: Array<Array<T>> = [[]];

  const len = Math.pow(2, array.length);
  for (let i = 0; i < len; i++) {
    const newArray: T[] = [];
    for (let j = 0; j < array.length; j++) {
      if (i & Math.pow(2, j)) {
        newArray.push(array[j]);
      }
    }
    if (newArray.length !== 0) resultStack.push(newArray);
  }

  return resultStack;
};

/**
 * Uses type assertions to allow `Combination<T>` to be used in a position where `T` is not legal.
 * This can produce runtime errors, but has utility for testing scenarios where your types are wrong at runtime.
 * This function should be ***used with caution*** - it is an escape hatch from the otherwise sound types of this package.
 * ```
 * generate<{
 *   key: string;
 * }>({
 *   key: illegal(optional("value")),
 * });
 * ```
 * Usage of illegal convinces typescript that it is ok for {@link optional} to be in the position of key, even though key is not optional.
 * Without usage of illegal, typescript will complain that optional cannot be used here, because it might return {@link KeyValueUndefined}.
 *
 * However, please keep in mind this means `'R' could be instantiated with an arbitrary type which could be unrelated to 'T'.` per `ts(2352)`
 * ```
 * generate<{
 *   key: string[];
 * }>({
 *   key: illegal(one([1, 2, 3])),
 *         // ^ illegal<number, string[]>(combination: Combination<number>): Combination<string[]>
 * });
 * ```
 * In this example, key will be instantiated with one of `[1, 2, 3]` even though `key: string[]`.
 * This will almost certainly throw a a runtime error.
 * By using {@link illegal}, you are telling TS not to worry about the type of this key.
 *
 * @param combination a `Combination<T>` to be used in a position where `T` is not legal
 * @returns a `Combination<R>` that can be used in the position where `T` would be illegal
 *
 * @see {@link Combination}
 */
export const illegal = <T, R>(combination: Combination<T>): Combination<R> =>
  combination as unknown as Combination<R>;

/**
 * Generates the combination of all elements in values. Sets the key to the combination of the return value of {@link arrayCombinate}.
 * ```
 * generate<{
 *   key: string[];
 * }>({
 *   key: some(['a', 'b', 'c']),
 * });
 * ```
 * will `return`
 * ```
 * [
 *  { key: [] },
 *  { key: ['a'] },
 *  { key: ['b'] },
 *  { key: ['a', 'b'] }
 *  // etc
 * ]
 * ```
 *
 * @param values the values to combine
 * @returns the combination of every value in values, including an empty array
 *
 * @see {@link arrayCombinate}
 * @see {@link generate}
 */
export const some = <T extends Value>(values: T[]) =>
  new Combination(() => arrayCombinate<T>(values));

/**
 * Generates the combination of defined and undefined for a value.
 *
 * ```
 * generate<{
 *   key?: string;
 * }>({
 *   key: optional("value"),
 * });
 * ```
 * will `return`
 * ```
 * [{key: "value"}, {}]
 * ```
 *
 * @param value the value which is optionally defined on the property
 * @returns the combination of the defined and undefined state of the value
 *
 * To make a custom Combination that contains an option with the key and value undefined
 * the same way this function does, use {@link KeyValueUndefined}.
 *
 * @see {@link generate}
 */
export const optional = <T>(value: T): Combination<T | KeyValueUndefined> =>
  new Combination(() => [value, new KeyValueUndefined()]);

/**
 * Generates the combination of exactly one value for each value passed.
 *
 * ```
 * generate<{
 *   key: string;
 * }>({
 *   key: one(["a value", "another value"]),
 * });
 * ```
 * will `return`
 * ```
 * [{key: "a value"}, {key: "another value"}]
 * ```
 *
 * @param values the values of which one should be assigned to the key
 * @returns the combination of exactly one value for each value passed
 */
export const one = <T>(values: T[]) => new Combination(() => values);

// generate and associated functions below

/**
 * Returns an object that only contains the keys that `shouldRemove(key)` returns false for.
 */
const makeBaseObject = <T>(
  shouldRemove: (key: keyof typeof object) => boolean,
  object: Record<string, T>
) =>
  Object.keys(object).reduce((baseObject, key: keyof typeof object) => {
    if (!shouldRemove(key)) {
      baseObject[key] = object[key];
    }
    return baseObject;
  }, {} as Partial<typeof object>);

type generateConstraint = Record<string, Value>;

/**
 * The type of a generation template.
 * This type ensures that value for a given key is a value that is allowed by its type,
 * or a combination of values that are allowed by their type.
 *
 * In other words, the value is its original typed value `T` or a `Combination<T>`.
 */
export type generateTemplate<Obj> = {
  [key in keyof Obj]: Partial<Obj>[key] extends Obj[key]
    ? Obj[key] extends infer T
      ? T | Combination<T | KeyValueUndefined>
      : never
    : Obj[key] extends infer T
    ? Obj[key] | Combination<T>
    : Obj[key];
};
/**
 * Generates the combination of all Combinations and values in the template.
 *
 * @param object the template for the generation, containing {@link Combination}s and values
 * @param log if the details of the generation should be logged to the console for insight
 * @returns an array of objects that are the combinations of the values in the template
 */
const generate = <T extends generateConstraint>(
  object: generateTemplate<T>,
  log = false
): T[] => {
  const baseObject = makeBaseObject(
    (key) => isCombination(object[key]),
    object as Record<keyof T, Value>
  );

  const objectCombinations = Object.entries(object).reduce(
    (array, [k, v]: [string, Combination<Value> | Value]) => {
      if (isCombination(v)) {
        array.push([k, v.values()]);
      }
      return array;
    },
    [] as Array<CombinationKeyValues<T>>
  );

  if (log) {
    console.log("base object:", baseObject);
    console.log(
      "combinations to apply:",
      objectCombinations.reduce((obj, [k, values]) => {
        obj[k] = values;
        return obj;
      }, {} as Record<string, Array<Value | KeyValueUndefined>>)
    );
  }

  let combos: T[] = [];

  /*
  iterate keys
    make scratch array
    iterate the values of that key
      iterate every old combo
        add this new key to that combo
        add new combo to scratch
    set combos to scratch
  */
  for (let i = 0; i < objectCombinations.length; i++) {
    const [key, values] = objectCombinations[i];
    const scratch: T[] = [];
    for (let j = 0; j < values.length; j++) {
      const value = values[j];
      for (let k = 0; k < (combos.length || 1); k++) {
        const combo: T = Object.assign({}, baseObject, combos[k]);
        // THIS CAST COULD BE INVALID FOR SOME GENERICS, RESULTING IN A RUNTIME ERROR
        if (!isKeyValueUndefined(value))
          (combo as Record<keyof T, Value>)[key] = value;
        scratch.push(combo);
      }
    }
    combos = scratch;
  }

  return combos;
};
generate.mutable = <T extends generateConstraint>(
  object: Parameters<typeof generate<T>>[0],
  log?: Parameters<typeof generate<T>>[1]
) => {
  const result = generate(object, log);
  if (typeof structuredClone === "function") {
    try {
      return result.map((obj) => structuredClone(obj));
    } catch (e) {
      console.error("Error cloning generated data:", e);
      return result;
    }
  }
  console.error(
    "Error cloning generated data: structuredClone is not available in this environment.",
    "Use a deep clone library instead of calling generate.mutable()"
  );
  return result;
};

export { generate };

/*
generate({
  a: some([1, 2, 3]),
  b: optional(10),
})
*/
