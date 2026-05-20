import { defineConfig, type OxlintConfig } from 'oxlint';
import config from 'oxlint-config-raccoon/typescript' with { type: 'json' };

export default defineConfig({
  extends: [config as unknown as OxlintConfig],
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: ['plugins/*/main.js'],
});
