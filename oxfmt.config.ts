import { defineConfig, type OxfmtConfig } from 'oxfmt';
import config from 'oxlint-config-raccoon/oxfmt' with { type: 'json' };

export default defineConfig({
  ...(config as OxfmtConfig),
  ignorePatterns: ['plugins/*/main.js'],
});
