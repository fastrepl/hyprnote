export const actually_string = <T>(value: T) => {
  return JSON.stringify(value satisfies T) as unknown as T;
};
