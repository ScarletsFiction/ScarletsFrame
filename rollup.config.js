import babel from "@rollup/plugin-babel";
import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";

const plugins = [sourcemaps()];

if(process.env.production)
  plugins.push(terser({ output: { comments: false } }));

const config = [{
  input: "src/index.dev.js",
  output: {
    file: "dist/scarletsframe.dev.js",
    sourcemap: true,
    sourcemapFile: "dist/scarletsframe.dev.js.map",
    format: "umd",
    name: "sf"
  },
  plugins: plugins.slice(0) // Copy
}];

if(process.env.production){
  config.push({
    input: "src/index.prod.js",
    output: {
      file: "dist/scarletsframe.modern.js",
      sourcemap: true,
      sourcemapFile: "dist/scarletsframe.modern.js.map",
      format: "umd",
      name: "sf"
    },
    plugins: plugins.slice(0) // Copy
  });

  plugins.push(babel({ babelHelpers: 'bundled' }));
  config.push({
    input: "src/index.prod.js",
    output: {
      file: "dist/scarletsframe.min.js",
      sourcemap: true,
      sourcemapFile: "dist/scarletsframe.min.js.map",
      format: "umd",
      name: "sf"
    },
    plugins: plugins.slice(0) // Copy
  });

  config.push({
    input: "src/index.squery.js",
    output: {
      file: "dist/squery.min.js",
      sourcemap: true,
      sourcemapFile: "dist/squery.min.js.map",
      format: "umd",
      name: "sf"
    },
    plugins: plugins.slice(0) // Copy
  });
}

export default config;
