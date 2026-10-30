// A design is built once as a scene (filled rectangles and paths in absolute coordinates), and
// that same scene is written out as SVG and rasterized to PNG, so the vector and bitmap versions
// of a design can't disagree.
//
// A scene is { w, h, label, items }. Each item is { fill: '#rrggbb', shape }, painted in order. A
// shape is rect(...) or a path: a list of { op, pts }, with op one of SVG's M, L, Q, C and Z, and
// pts holding 1 point for M and L, 2 for Q (control, end), 3 for C (control, control, end) and
// none for Z. Paths are filled with the nonzero rule.

/** An axis-aligned rectangle with corner radius r. */
export function rect(x, y, w, h, r = 0) {
	return { rect: true, x, y, w, h, r };
}

/** A closed path through pts, each [x, y]. */
export function polygon(...pts) {
	const [first, ...rest] = pts;
	return [
		{ op: 'M', pts: [first] },
		...rest.map((p) => ({ op: 'L', pts: [p] })),
		{ op: 'Z', pts: [] }
	];
}

/** Maps every point of the path through f. */
export function transform(path, f) {
	return path.map((c) => ({ op: c.op, pts: c.pts.map(f) }));
}

/**
 * Returns a function rotating points around c by the angle whose sine and cosine are given. Scene
 * y points down, so a negative sine turns counterclockwise on screen.
 */
export function rotate([cx, cy], sin, cos) {
	return ([x, y]) => {
		const dx = x - cx;
		const dy = y - cy;
		return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
	};
}

/** Formats a coordinate to at most two decimals, the precision every asset is drawn at. */
export function num(v) {
	const rounded = (Math.sign(v) * Math.round(Math.abs(v) * 100)) / 100;
	return String(rounded === 0 ? 0 : rounded); // normalises -0
}

/** Renders the scene as a standalone SVG document. */
export function svg(scene) {
	const { w, h, label, items } = scene;
	let out =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(w)} ${num(h)}" ` +
		`width="${num(w)}" height="${num(h)}" role="img" aria-label="${label}">`;
	for (const { fill, shape } of items) {
		if (shape.rect) {
			const radius = shape.r > 0 ? ` rx="${num(shape.r)}"` : '';
			out +=
				`<rect x="${num(shape.x)}" y="${num(shape.y)}" ` +
				`width="${num(shape.w)}" height="${num(shape.h)}"${radius} fill="${fill}"/>`;
		} else {
			out += `<path fill="${fill}" d="${pathData(shape)}"/>`;
		}
	}
	return `${out}</svg>\n`;
}

function pathData(path) {
	return path.map((c) => c.op + c.pts.map(([x, y]) => `${num(x)} ${num(y)}`).join(' ')).join(' ');
}
