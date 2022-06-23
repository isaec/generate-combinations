export type Value =
  | string
  | number
  | {
      [key: string]: Value;
    }
  | Value[];

class Combination<T> {
  values: () => Array<T>;
  constructor(values: () => ReturnType<Combination<T>["values"]>) {
    this.values = values;
  }
}

type CombinationKeyValues<T> = [keyof T & string, Array<Value | null>];

const isCombination = <T>(
  data: Combination<T> | Value
): data is Combination<T> => data instanceof Combination;

// https://codereview.stackexchange.com/questions/7001/generating-all-combinations-of-an-array
/**
 * returns an array with every combination of the keys of the passed array - not every ordering is returned
 *
 * ``arrayCombinate([1, 2, 3])`` returns
 * ```
 * [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
 * ```
 * Notice how it contains every *combination* of the array, not every permutation.
 *
 * This function powers the {@link some} combinator.
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
 * generates the combination of all elements in values
 *
 * @param values the values to combine
 * @returns the combination of every value in values, including an empty array
 */
export const some = <T extends Value>(values: T[]) =>
  new Combination(() => arrayCombinate<T>(values));

/**
 * generates the combination of defined and undefined for a value
 *
 * @param value the value which is optionally defined on the property
 * @returns the combination of the defined and undefined state of the value
 */
export const optional = <T>(value: T): Combination<T | undefined> =>
  new Combination(() => [
    value,
    null /* this is a necessary evil to allow optional to apply to undefined unions */ as unknown as undefined,
  ]);

export const one = <T>(values: T[]) => new Combination(() => values);

// generate and associated functions below

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

export type generateTemplate<Obj> = {
  [key in keyof Obj]: Obj[key] extends infer T
    ? Obj[key] | Combination<T>
    : Obj[key];
};
export const generate = <T extends Record<string, Value>>(
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
    let hasNull = false;
    console.log(
      "combinations to apply:",
      objectCombinations.reduce((obj, [k, values]) => {
        obj[k] = values;
        if (values.includes(null)) hasNull = true;
        return obj;
      }, {} as Record<string, Array<Value | null>>)
    );
    if (hasNull)
      console.log("key will not be defined when combination value is", null);
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
        if (value !== null) (combo as Record<keyof T, Value>)[key] = value;
        scratch.push(combo);
      }
    }
    combos = scratch;
  }

  return combos;
};

/*
generate({
  a: some([1, 2, 3]),
  b: optional(10),
})
*/
