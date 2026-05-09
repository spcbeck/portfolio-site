/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import html from '@web/rollup-plugin-html';
import {copy} from '@web/rollup-plugin-copy';
import summary from 'rollup-plugin-summary';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

export default {
  input: 'my-element.js',
  output: {
    dir: 'build',
  },
  onwarn(warning) {
    if (warning.code !== 'THIS_IS_UNDEFINED') {
      console.error(`(!) ${warning.message}`);
    }
  },
  plugins: [
    html({
      input: 'index.html',
    }),
    replace({preventAssignment: false, 'Reflect.decorate': 'undefined'}),
    resolve(),
    minifyHTML(),
    /**
     * This minification setup serves the static site generation.
     * For bundling and minification, check the README.md file.
     */
    terser({
      ecma: 2021,
      module: true,
      warnings: true,
      mangle: {
        properties: {
          regex: /^__/,
        },
      },
    }),
    summary(),
    copy({
      patterns: ['images/**/*'],
    }),
  ],
  preserveEntrySignatures: 'strict',
};
