// Converts text to outlines, so the generated SVGs render the same everywhere without the font
// installed.
import opentype from 'opentype.js';

/** Parses a TrueType/OpenType font from a Node Buffer. */
export function loadFont(data) {
	const font = opentype.parse(
		data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
	);
	if (!font.tables.os2?.sCapHeight) {
		throw new Error('font has no cap height');
	}
	return font;
}

/** The height of capital letters at the given size. */
export function capHeight(font, size) {
	return (font.tables.os2.sCapHeight * size) / font.unitsPerEm;
}

/**
 * Lays out runs ({ text, fill }, each a stretch of text in one colour) on one line starting at x,
 * with tracking (extra space between letters) in ems. y is the baseline. Returns one path item per
 * run, plus the line's width.
 */
export function layOut(font, runs, size, tracking, x, y) {
	const scale = size / font.unitsPerEm;
	const count = runs.reduce((n, r) => n + [...r.text].length, 0);
	const items = [];
	let pen = x;
	let i = 0;
	for (const { text, fill } of runs) {
		const path = [];
		for (const ch of text) {
			const glyph = font.charToGlyph(ch);
			if (glyph.index === 0) {
				throw new Error(`font has no glyph for "${ch}"`);
			}
			const penX = pen;
			// Font units have y pointing up; scenes have it pointing down.
			const place = ({ x: px, y: py }) => [penX + px * scale, y - py * scale];
			for (const c of outline(glyph)) {
				path.push({ op: c.op, pts: c.pts.map(place) });
			}
			pen += glyph.advanceWidth * scale;
			if (++i < count) {
				pen += tracking * size;
			}
		}
		if (path.length > 0) {
			items.push({ fill, shape: path });
		}
	}
	return { items, width: pen - x };
}

// A glyph's outline as path commands in font units. TrueType stores each contour as a loop of
// points on or off the curve, with an on-curve point implied midway between two off-curve ones.
function outline(glyph) {
	void glyph.path; // opentype.js loads a glyph's points when its path is first read
	return glyph.getContours().flatMap(contourPath);
}

// Rounds towards zero, in font units, as these outlines always have: changing it would move the
// wordmark's curves by a tiny amount in every SVG for no benefit.
function midpoint(p, q) {
	return { x: Math.trunc((p.x + q.x) / 2), y: Math.trunc((p.y + q.y) / 2) };
}

function contourPath(points) {
	const path = [];
	let start;
	let firstOff;
	let lastOff;
	for (const p of points) {
		if (start === undefined) {
			if (p.onCurve) {
				start = p;
				path.push({ op: 'M', pts: [p] });
			} else if (firstOff === undefined) {
				firstOff = p;
			} else {
				start = midpoint(firstOff, p);
				lastOff = p;
				path.push({ op: 'M', pts: [start] });
			}
		} else if (lastOff === undefined) {
			if (p.onCurve) {
				path.push({ op: 'L', pts: [p] });
			} else {
				lastOff = p;
			}
		} else if (p.onCurve) {
			path.push({ op: 'Q', pts: [lastOff, p] });
			lastOff = undefined;
		} else {
			path.push({ op: 'Q', pts: [lastOff, midpoint(lastOff, p)] });
			lastOff = p;
		}
	}

	if (firstOff !== undefined && lastOff !== undefined) {
		path.push({ op: 'Q', pts: [lastOff, midpoint(lastOff, firstOff)] });
		lastOff = undefined;
	}
	const control = firstOff ?? lastOff;
	if (firstOff !== undefined || lastOff !== undefined) {
		path.push({ op: 'Q', pts: [control, start] });
	} else {
		path.push({ op: 'L', pts: [start] });
	}
	path.push({ op: 'Z', pts: [] });
	return path;
}
