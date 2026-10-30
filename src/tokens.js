// Parses tokens.json, the single source of mykeebs' colours and fonts. A palette is a list of
// { name, value } in the order the file lists them, so generated output (tokens.css) keeps the
// file's grouping. Names are the CSS custom property names without the leading "--".

/** Returns the value of the named token, or undefined. */
export function lookup(palette, name) {
	return palette.find((t) => t.name === name)?.value;
}

/** Reads tokens.json into its logo and theme palettes. */
export function parseTokens(text) {
	const parsed = JSON.parse(text);
	const logo = palette(parsed.logo);
	const theme = palette(parsed.theme);
	if (logo.length === 0 || theme.length === 0) {
		throw new Error('tokens.json needs both a logo and a theme section');
	}
	const duplicate = duplicateKey(text);
	if (duplicate !== undefined) {
		throw new Error(`token "${duplicate}" is listed twice`);
	}
	return { logo, theme };
}

function palette(section = {}) {
	return Object.entries(section).map(([name, value]) => {
		if (typeof value !== 'string') {
			throw new Error(`token "${name}": value must be a string`);
		}
		if (value === '') {
			throw new Error(`token "${name}" is empty`);
		}
		return { name, value };
	});
}

// JSON.parse keeps the last of two equal keys without complaint, so duplicates have to be found
// in the text. Returns the first key repeated within one object.
function duplicateKey(text) {
	const scopes = [];
	const string = /"(?:[^"\\]|\\.)*"/y;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '{') {
			scopes.push(new Set());
		} else if (ch === '}') {
			scopes.pop();
		} else if (ch === '"') {
			string.lastIndex = i;
			const literal = string.exec(text)[0];
			i += literal.length - 1;
			if (text.slice(i + 1).trimStart()[0] === ':') {
				const key = JSON.parse(literal);
				const scope = scopes.at(-1);
				if (scope.has(key)) {
					return key;
				}
				scope.add(key);
			}
		}
	}
	return undefined;
}
