import { transformAsync as babelTransform } from "@babel/core";
import pluginTransformTypeScript from "@babel/plugin-transform-typescript";

export async function transform(code: string) {
  const babelResult = await babelTransform(code, {
    plugins: [pluginTransformTypeScript]
  });

  return babelResult?.code;
}
