import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lookup, parseTokens } from '../src/tokens.js';

describe('parseTokens', () => {
	it('keeps file order', () => {
		const t = parseTokens('{"logo":{"b":"#2","a":"#1"},"theme":{"z":"1","y":"2","x":"3"}}');
		assert.deepEqual(
			t.logo.map((p) => p.name),
			['b', 'a']
		);
		assert.deepEqual(
			t.theme.map((p) => p.name),
			['z', 'y', 'x']
		);
	});

	it('looks up tokens by name', () => {
		const palette = [{ name: 'accent', value: '#e8a33d' }];
		assert.equal(lookup(palette, 'accent'), '#e8a33d');
		assert.equal(lookup(palette, 'missing'), undefined);
	});

	it('rejects duplicate names', () => {
		assert.throws(
			() => parseTokens('{"logo":{"a":"#1","a":"#2"},"theme":{"x":"1"}}'),
			/"a" is listed twice/
		);
	});

	it('allows one name in both sections', () => {
		const t = parseTokens('{"logo":{"a":"#1"},"theme":{"a":"#2"}}');
		assert.equal(lookup(t.theme, 'a'), '#2');
	});

	it('rejects empty values', () => {
		assert.throws(() => parseTokens('{"logo":{"a":""},"theme":{"x":"1"}}'), /"a" is empty/);
	});

	it('rejects non-string values', () => {
		assert.throws(
			() => parseTokens('{"logo":{"a":1},"theme":{"x":"1"}}'),
			/"a": value must be a string/
		);
	});

	it('rejects a missing section', () => {
		assert.throws(
			() => parseTokens('{"logo":{"a":"#1"}}'),
			/needs both a logo and a theme section/
		);
	});
});
