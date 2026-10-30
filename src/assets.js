// Lists every file in dist/ and builds it from tokens.json and the vendored font. gen.js writes the
// output; the tests check the committed dist/ still matches it.
import { loadFont } from './font.js';
import {
	APP_ICON_FRAC,
	DISCORD_FRAC,
	coloursFrom,
	devAvatar,
	favicon16,
	favicon32,
	horizontal,
	mark,
	onDark,
	onLight,
	stacked,
	tile
} from './logo.js';
import { encodePNG, ico } from './png.js';
import { render } from './raster.js';
import { svg } from './scene.js';
import { parseTokens } from './tokens.js';

// Paths within the repo.
export const TOKENS_FILE = 'tokens.json';
export const FONT_FILE = 'fonts/JetBrainsMono-ExtraBold.ttf';
export const DIST_DIR = 'dist';

/** Renders every asset. Returns a Map of file name under dist/ to Buffer. */
export function build(tokensJSON, fontData) {
	const tokens = parseTokens(tokensJSON);
	const c = coloursFrom(tokens.logo);
	const font = loadFont(fontData);
	const dev = devAvatar(font, c);
	const discord = tile(c, DISCORD_FRAC, 'mykeebs Discord avatar');
	const appIcon = tile(c, APP_ICON_FRAC, 'mykeebs');

	const files = new Map([['tokens.css', Buffer.from(tokensCSS(tokens))]]);

	const svgs = {
		'logo-horizontal-on-dark.svg': horizontal(font, onDark(c)),
		'logo-horizontal-on-light.svg': horizontal(font, onLight(c)),
		'logo-stacked-on-dark.svg': stacked(font, onDark(c)),
		'logo-stacked-on-light.svg': stacked(font, onLight(c)),
		'mark-on-dark.svg': mark(onDark(c)),
		'mark-on-light.svg': mark(onLight(c)),
		'favicon.svg': favicon32(c),
		'discord-avatar.svg': discord,
		'discord-avatar-dev.svg': dev
	};
	for (const [name, scene] of Object.entries(svgs)) {
		files.set(name, Buffer.from(svg(scene)));
	}

	const pngs = [
		['favicon-16.png', favicon16(c), 16],
		['favicon-32.png', favicon32(c), 32],
		['apple-touch-icon.png', appIcon, 180],
		['icon-192.png', appIcon, 192],
		['icon-512.png', appIcon, 512],
		['discord-avatar.png', discord, 1024],
		['discord-avatar-dev.png', dev, 1024]
	];
	for (const [name, scene, px] of pngs) {
		files.set(name, encodePNG(render(scene, px)));
	}

	const favicon48 = encodePNG(render(favicon32(c), 48)); // only needed inside the .ico
	files.set(
		'favicon.ico',
		ico(files.get('favicon-16.png'), files.get('favicon-32.png'), favicon48)
	);
	return files;
}

// Renders the tokens as CSS custom properties: theme tokens under their own names (--accent), logo
// colours prefixed (--logo-amber).
function tokensCSS({ logo, theme }) {
	const lines = (palette, prefix) =>
		palette.map(({ name, value }) => `\t--${prefix}${name}: ${value};\n`).join('');
	return (
		'/* Generated from tokens.json by `mise run gen`. Do not edit. */\n:root {\n' +
		`${lines(theme, '')}\n${lines(logo, 'logo-')}}\n`
	);
}
