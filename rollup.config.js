import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  entry: 'index.js',
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),

    commonjs(),

    babel({
      presets: ['es2015-rollup'],
      exclude: 'node_modules/**',
      babelrc: false
    }),
  ],
  dest: 'build/index.js',
};
