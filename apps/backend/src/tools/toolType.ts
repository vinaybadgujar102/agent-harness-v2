export type FunctionT = {
  type: "function";
  /**
   * The name of the function.
   */
  name?: string | undefined;
  /**
   * A description of the function.
   */
  description?: string | undefined;
  /**
   * The JSON Schema for the function's parameters.
   */
  parameters?: any | undefined;
};
