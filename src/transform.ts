import { transform as babelTransform } from "@babel/core";

export function transform(code: string) {
  return babelTransform(code, {
    plugins: ["@babel/plugin-transform-typescript"]
  });
}
