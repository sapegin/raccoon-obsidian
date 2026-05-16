import tamiaTypeScript from 'eslint-config-tamia/typescript';

const config = [
  ...tamiaTypeScript,
  {
    ignores: ['**/main.js', '**/node_modules/**'],
  },
];

export default config;
