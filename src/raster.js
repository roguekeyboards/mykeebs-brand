// Rasterizes scenes, with no native dependency: a signed-area coverage accumulator, the floating
// point algorithm from Go's golang.org/x/image/vector, which drew these assets first. Its results
// are in float32, so the arithmetic here is too, through Math.fround and Float32Array.
import { parseColour } from './png.js';

const f = Math.fround;

// Scales coverage in [0, 1] to [0, 0xffff]: 65536 would wrap full coverage round to 0, and 65535
// would lose it to rounding errors.
const ALMOST_65536 = f(255.99998 * 256);

// Places cubic Bézier control points to approximate a quarter circle.
const KAPPA = 0.5522847498;

/**
 * Rasterizes the scene at width px (height keeps the aspect ratio), antialiased, onto a
 * transparent background. Returns { width, height, pix }, with pix as premultiplied RGBA.
 */
export function render(scene, px) {
	const scale = px / scene.w;
	const width = px;
	const height = Math.round(scene.h * scale);
	const pix = new Uint8Array(width * height * 4);
	for (const { fill, shape } of scene.items) {
		const colour = parseColour(fill);
		const coverage = new Rasterizer(width, height).trace(
			shape.rect ? rectPath(shape) : shape,
			scale
		);
		paint(pix, coverage, colour);
	}
	return { width, height, pix };
}

// Outlines the rectangle, rounding its corners with cubic curves.
function rectPath({ x, y, w, h, r }) {
	const [x1, y1] = [x + w, y + h];
	const k = r * KAPPA;
	return [
		{ op: 'M', pts: [[x + r, y]] },
		{ op: 'L', pts: [[x1 - r, y]] },
		{
			op: 'C',
			pts: [
				[x1 - r + k, y],
				[x1, y + r - k],
				[x1, y + r]
			]
		},
		{ op: 'L', pts: [[x1, y1 - r]] },
		{
			op: 'C',
			pts: [
				[x1, y1 - r + k],
				[x1 - r + k, y1],
				[x1 - r, y1]
			]
		},
		{ op: 'L', pts: [[x + r, y1]] },
		{
			op: 'C',
			pts: [
				[x + r - k, y1],
				[x, y1 - r + k],
				[x, y1 - r]
			]
		},
		{ op: 'L', pts: [[x, y + r]] },
		{
			op: 'C',
			pts: [
				[x, y + r - k],
				[x + r - k, y],
				[x + r, y]
			]
		},
		{ op: 'Z', pts: [] }
	];
}

// Composites the colour over pix through the coverage, in premultiplied alpha.
function paint(pix, coverage, [r, g, b]) {
	const [sr, sg, sb] = [r * 0x101, g * 0x101, b * 0x101];
	let acc = 0;
	for (let i = 0; i < coverage.length; i++) {
		acc = f(acc + coverage[i]);
		const mask = Math.trunc(f(ALMOST_65536 * Math.min(Math.abs(acc), 1)));
		const a = 0xffff - mask;
		const o = i * 4;
		pix[o] = over(pix[o], a, sr, mask);
		pix[o + 1] = over(pix[o + 1], a, sg, mask);
		pix[o + 2] = over(pix[o + 2], a, sb, mask);
		pix[o + 3] = over(pix[o + 3], a, 0xffff, mask);
	}
}

function over(dst, a, src, mask) {
	return Math.floor((dst * 0x101 * a + src * mask) / 0xffff) >>> 8;
}

class Rasterizer {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.buf = new Float32Array(width * height);
		this.firstX = this.firstY = this.penX = this.penY = 0;
	}

	// Adds the path, scaled to pixels, and returns the coverage deltas.
	trace(path, scale) {
		const pts = (c) => c.pts.flatMap(([x, y]) => [f(x * scale), f(y * scale)]);
		for (const c of path) {
			const p = pts(c);
			if (c.op === 'M') {
				[this.firstX, this.firstY] = p;
				[this.penX, this.penY] = p;
			} else if (c.op === 'L') {
				this.lineTo(p[0], p[1]);
			} else if (c.op === 'Q') {
				this.quadTo(...p);
			} else if (c.op === 'C') {
				this.cubeTo(...p);
			} else {
				this.lineTo(this.firstX, this.firstY);
			}
		}
		this.lineTo(this.firstX, this.firstY);
		return this.buf;
	}

	quadTo(bx, by, cx, cy) {
		const [ax, ay] = [this.penX, this.penY];
		const n = segments(devSquared(ax, ay, bx, by, cx, cy));
		const inv = f(1 / n);
		let t = 0;
		for (let i = 0; i < n - 1; i++) {
			t = f(t + inv);
			const [abx, aby] = lerp(t, ax, ay, bx, by);
			const [bcx, bcy] = lerp(t, bx, by, cx, cy);
			this.lineTo(...lerp(t, abx, aby, bcx, bcy));
		}
		this.lineTo(cx, cy);
	}

	cubeTo(bx, by, cx, cy, dx, dy) {
		const [ax, ay] = [this.penX, this.penY];
		const n = segments(
			Math.max(devSquared(ax, ay, bx, by, dx, dy), devSquared(ax, ay, cx, cy, dx, dy))
		);
		const inv = f(1 / n);
		let t = 0;
		for (let i = 0; i < n - 1; i++) {
			t = f(t + inv);
			const [abx, aby] = lerp(t, ax, ay, bx, by);
			const [bcx, bcy] = lerp(t, bx, by, cx, cy);
			const [cdx, cdy] = lerp(t, cx, cy, dx, dy);
			const [abcx, abcy] = lerp(t, abx, aby, bcx, bcy);
			const [bcdx, bcdy] = lerp(t, bcx, bcy, cdx, cdy);
			this.lineTo(...lerp(t, abcx, abcy, bcdx, bcdy));
		}
		this.lineTo(dx, dy);
	}

	lineTo(toX, toY) {
		let [ax, ay, bx, by] = [this.penX, this.penY, toX, toY];
		this.penX = toX;
		this.penY = toY;
		let dir = 1;
		if (ay > by) {
			dir = -1;
			[ax, ay, bx, by] = [bx, by, ax, ay];
		}
		// Almost horizontal segments would make 1 / (by - ay) unstable, and yield next to no
		// change in coverage anyway.
		if (f(by - ay) <= f(0.000001)) {
			return;
		}
		const dxdy = f(f(bx - ax) / f(by - ay));

		let x = ax;
		const yMax = Math.min(Math.ceil(by), this.height);
		for (let y = Math.floor(ay); y < yMax; y++) {
			const dy = f(Math.min(y + 1, by) - Math.max(y, ay));
			const xNext = f(x + f(dy * dxdy));
			if (y >= 0) {
				this.addRow(y, f(dy * dir), x, xNext);
			}
			x = xNext;
		}
	}

	// Adds one row's coverage for a segment running from x to xNext.
	addRow(y, d, x, xNext) {
		const [x0, x1] = x > xNext ? [xNext, x] : [x, xNext];
		const x0i = Math.floor(x0);
		const x1i = Math.ceil(x1);

		if (x1i <= x0i + 1) {
			const xmf = f(f(0.5 * f(x + xNext)) - x0i);
			this.add(y, x0i, f(d - f(d * xmf)));
			this.add(y, x0i + 1, f(d * xmf));
			return;
		}

		const s = f(1 / f(x1 - x0));
		const x0f = f(x0 - x0i);
		const oneMinusX0f = f(1 - x0f);
		const a0 = f(f(f(0.5 * s) * oneMinusX0f) * oneMinusX0f);
		const x1f = f(f(x1 - x1i) + 1);
		const am = f(f(f(0.5 * s) * x1f) * x1f);

		this.add(y, x0i, f(d * a0));
		if (x1i === x0i + 2) {
			this.add(y, x0i + 1, f(d * f(f(1 - a0) - am)));
		} else {
			const a1 = f(s * f(1.5 - x0f));
			this.add(y, x0i + 1, f(d * f(a1 - a0)));
			const dTimesS = f(d * s);
			for (let xi = x0i + 2; xi < x1i - 1; xi++) {
				this.add(y, xi, dTimesS);
			}
			const a2 = f(a1 + f(s * (x1i - x0i - 3)));
			this.add(y, x1i - 1, f(d * f(f(1 - a2) - am)));
		}
		this.add(y, x1i, f(d * am));
	}

	// x is clamped to the row, one past its end being the next row's start: the coverage deltas
	// accumulate across the whole buffer, so past the right edge they still have to land.
	add(y, x, v) {
		const i = y * this.width + Math.min(Math.max(x, 0), this.width);
		if (i < this.buf.length) {
			this.buf[i] += v;
		}
	}
}

// How curvy a Bézier segment is, which sets how many lines approximate it.
function devSquared(ax, ay, bx, by, cx, cy) {
	const devx = f(f(ax - f(2 * bx)) + cx);
	const devy = f(f(ay - f(2 * by)) + cy);
	return f(f(devx * devx) + f(devy * devy));
}

function segments(devsq) {
	return devsq >= f(0.333) ? 1 + Math.trunc(Math.sqrt(Math.sqrt(3 * devsq))) : 1;
}

function lerp(t, px, py, qx, qy) {
	return [f(px + f(t * f(qx - px))), f(py + f(t * f(qy - py)))];
}
