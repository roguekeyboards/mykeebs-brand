import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig(js.configs.recommended, prettier, {
	languageOptions: { globals: globals.node }
});
