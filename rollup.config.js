import babel from "@rollup/plugin-babel";
import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";

const plugins = [sourcemaps(), babel({
  babelHelpers: 'bundled'
})];

if(process.env.production)
  plugins.push(terser({ output: { comments: false } }));

export default [{
  input: "src/index.no-hr.js",
  output: {
    file: "dist/scarletsframe.min.js",
    sourcemap: true,
    sourcemapFile: "dist//scarletsframe.min.js.map",
    format: "iife",
    name: "sf"
  },
  plugins
}, {
  input: "src/index.js",
  output: {
    file: "dist/scarletsframe.hot.js",
    sourcemap: true,
    sourcemapFile: "dist//scarletsframe.hot.js.map",
    format: "iife",
    name: "sf"
  },
  plugins
}];
