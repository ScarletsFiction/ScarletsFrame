import babel from "@rollup/plugin-babel";
import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";

const plugins = [sourcemaps(), babel({
  babelHelpers: 'bundled'
})];

if(process.env.production)
  plugins.push(terser({ output: { comments: false } }));

export default {
  input: "src/index.js",
  output: {
    file: "dist/main.js",
    format: "iife",
  },
  plugins
};
