import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginTs from 'typescript-eslint';
// import pluginUnicorn from 'eslint-plugin-unicorn';

// https://typescript-eslint.io/getting-started
export default pluginTs.config(
  pluginJs.configs.recommended,
  pluginTs.configs.recommended,
  // pluginUnicorn.configs['flat/recommended'], // TODO activate unicorn
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn', // TODO enforce error
    },
  }
);
