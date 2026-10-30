// Draws mykeebs' logo artwork as scenes (see scene.js).
import { capHeight, layOut } from './font.js';
import { polygon, rect, rotate, transform } from './scene.js';
import { lookup } from './tokens.js';

const COLOUR_NAMES = {
	ink: 'ink',
	cream: 'cream',
	creamLip: 'cream-lip',
	amber: 'amber',
	amberLip: 'amber-lip',
	amberOnLight: 'amber-on-light',
	keyOnLight: 'key-on-light',
	keyLipOnLight: 'key-lip-on-light',
	devBanner: 'dev-banner',
	devBannerText: 'dev-banner-text'
};

/** Reads the logo colours from tokens.json's logo palette. */
export function coloursFrom(palette) {
	const colours = {};
	for (const [key, name] of Object.entries(COLOUR_NAMES)) {
		colours[key] = lookup(palette, name);
		if (colours[key] === undefined) {
			throw new Error(`tokens.json logo section is missing "${name}"`);
		}
	}
	return colours;
}

/** The logo for dark backgrounds: cream keys, amber spacebar, cream "my", amber "keebs". */
export function onDark(c) {
	return {
		key: c.cream,
		keyLip: c.creamLip,
		space: c.amber,
		spaceLip: c.amberLip,
		my: c.cream,
		keebs: c.amber
	};
}

/**
 * The logo for light backgrounds. "keebs" uses a darker amber, since the brand amber is too light
 * to read on cream.
 */
export function onLight(c) {
	return {
		key: c.keyOnLight,
		keyLip: c.keyLipOnLight,
		space: c.amber,
		spaceLip: c.amberLip,
		my: c.ink,
		keebs: c.amberOnLight
	};
}

// The mark: two keycaps over a spacebar, each a top face over a slightly taller, darker front lip.
// Drawn in a 100-unit box; the visible artwork spans MARK_X0..MARK_X0+MARK_W, MARK_Y0..MARK_Y0+MARK_H.
const MARK_X0 = 6;
const MARK_Y0 = 8;
export const MARK_W = 88;
export const MARK_H = 86;

const KEYS = [
	{ x: 6, y: 8, w: 42, lip: 40, top: 34, r: 10 },
	{ x: 52, y: 8, w: 42, lip: 40, top: 34, r: 10 },
	{ x: 6, y: 54, w: 88, lip: 40, top: 34, r: 10, space: true }
];

// Places the mark with its visible top-left at (x, y), scaled by s.
function markItems(p, x, y, s) {
	const tx = x - MARK_X0 * s;
	const ty = y - MARK_Y0 * s;
	return KEYS.flatMap((k) => {
		const kx = tx + k.x * s;
		return [
			{
				fill: k.space ? p.spaceLip : p.keyLip,
				shape: rect(kx, ty + (k.y + 2) * s, k.w * s, (k.lip - 2) * s, k.r * s)
			},
			{
				fill: k.space ? p.space : p.key,
				shape: rect(kx, ty + k.y * s, k.w * s, k.top * s, k.r * s)
			}
		];
	});
}

function wordmark(p) {
	return [
		{ text: 'my', fill: p.my },
		{ text: 'keebs', fill: p.keebs }
	];
}

/** The mark alone, cropped to its artwork. */
export function mark(p) {
	return { w: MARK_W, h: MARK_H, label: 'mykeebs', items: markItems(p, 0, 0, 1) };
}

/**
 * The mark beside the wordmark, for headers and nav bars. The wordmark's cap height is centred on
 * the mark.
 */
export function horizontal(font, p) {
	const [size, s, gap, tracking] = [50, 0.88, 25, -0.05];
	const h = MARK_H * s;
	const tx = MARK_W * s + gap;
	const baseline = h / 2 + capHeight(font, size) / 2;
	const text = layOut(font, wordmark(p), size, tracking, tx, baseline);
	return {
		w: tx + text.width,
		h,
		label: 'mykeebs',
		items: [...markItems(p, 0, 0, s), ...text.items]
	};
}

/** The mark above the wordmark, for square spaces. */
export function stacked(font, p) {
	const [size, gap, tracking] = [40, 18, -0.06];
	const s = 104 / MARK_W;
	const [mw, mh] = [MARK_W * s, MARK_H * s];
	const { width: tw } = layOut(font, wordmark(p), size, tracking, 0, 0);
	const w = Math.max(mw, tw);
	const baseline = mh + gap + capHeight(font, size);
	const text = layOut(font, wordmark(p), size, tracking, (w - tw) / 2, baseline);
	const descender = 0.24 * size; // room for the "y"
	return {
		w,
		h: baseline + descender,
		label: 'mykeebs',
		items: [...markItems(p, (w - mw) / 2, 0, s), ...text.items]
	};
}

/** The mark redrawn on a 32px grid so every edge lands on a pixel boundary: 2px gaps and a 2px lip. */
export function favicon32(c) {
	return {
		w: 32,
		h: 32,
		label: 'mykeebs',
		items: [
			{ fill: c.ink, shape: rect(0, 0, 32, 32, 7) },
			{ fill: c.creamLip, shape: rect(4, 5, 11, 10, 2.5) },
			{ fill: c.cream, shape: rect(4, 5, 11, 8, 2.5) },
			{ fill: c.creamLip, shape: rect(17, 5, 11, 10, 2.5) },
			{ fill: c.cream, shape: rect(17, 5, 11, 8, 2.5) },
			{ fill: c.amberLip, shape: rect(4, 17, 24, 10, 2.5) },
			{ fill: c.amber, shape: rect(4, 17, 24, 8, 2.5) }
		]
	};
}

/** The mark redrawn on a 16px grid. There's no room for a lip at this size, so the keys are flat. */
export function favicon16(c) {
	return {
		w: 16,
		h: 16,
		label: 'mykeebs',
		items: [
			{ fill: c.ink, shape: rect(0, 0, 16, 16, 3.5) },
			{ fill: c.cream, shape: rect(2, 3, 5, 4, 1) },
			{ fill: c.cream, shape: rect(9, 3, 5, 4, 1) },
			{ fill: c.amber, shape: rect(2, 9, 12, 4, 1) }
		]
	};
}

// The drawing size of the square icons; they're rendered down from it.
export const TILE_SIZE = 1024;

// Icon sizes: APP_ICON_FRAC for home-screen and app icons, DISCORD_FRAC for the Discord avatar,
// which Discord crops to a circle, so the mark has to fit inside it.
export const APP_ICON_FRAC = 0.6;
export const DISCORD_FRAC = 0.563;

/**
 * The on-dark mark centred on a full-bleed square, spanning frac of its width. Platforms that show
 * it (iOS, Android, Discord) round or crop the corners themselves.
 */
export function tile(c, frac, label) {
	const s = (TILE_SIZE * frac) / MARK_W;
	return {
		w: TILE_SIZE,
		h: TILE_SIZE,
		label,
		items: [
			{ fill: c.ink, shape: rect(0, 0, TILE_SIZE, TILE_SIZE) },
			...markItems(onDark(c), (TILE_SIZE - MARK_W * s) / 2, (TILE_SIZE - MARK_H * s) / 2, s)
		]
	};
}

/**
 * The Discord avatar with a diagonal "DEV" banner across the lower right, for the dev Discord
 * application. The banner sits inside Discord's circular crop, and its text reads lower-left to
 * upper-right.
 */
export function devAvatar(font, c) {
	const bandOffset = 300; // the banner centre line's distance from the centre, along the diagonal
	const bandWidth = 150;
	const size = 104;
	const tracking = 0.12;
	const reach = 2 * TILE_SIZE; // long enough to cross the whole tile

	const scene = tile(c, DISCORD_FRAC, 'mykeebs dev Discord avatar');
	const d = Math.SQRT2 / 2;
	const q = [TILE_SIZE / 2 + bandOffset * d, TILE_SIZE / 2 + bandOffset * d]; // along the lower-right diagonal
	const along = [d, -d]; // lower-left to upper-right
	const across = [d, d];
	const corner = (sa, sb) => [
		q[0] + sa * reach * along[0] + ((sb * bandWidth) / 2) * across[0],
		q[1] + sa * reach * along[1] + ((sb * bandWidth) / 2) * across[1]
	];
	scene.items.push({
		fill: c.devBanner,
		shape: polygon(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1))
	});

	const runs = [{ text: 'DEV', fill: c.devBannerText }];
	const { width: tw } = layOut(font, runs, size, tracking, 0, 0);
	const text = layOut(font, runs, size, tracking, q[0] - tw / 2, q[1] + capHeight(font, size) / 2);
	const turn = rotate(q, -d, d); // -45 degrees: the text runs up and to the right
	for (const item of text.items) {
		scene.items.push({ fill: item.fill, shape: transform(item.shape, turn) });
	}
	return scene;
}
