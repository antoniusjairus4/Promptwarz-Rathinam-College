import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx,js}'], languageOptions: { globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', navigator: 'readonly', console: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', AbortController: 'readonly', HTMLElement: 'readonly' } } }
);
