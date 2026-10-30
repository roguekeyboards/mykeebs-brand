import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TILE_SIZE, MARK_H, MARK_W, coloursFrom, mark, tile } from '../src/logo.js';
import { encodePNG, ico } from '../src/png.js';
import { render } from '../src/raster.js';
import { num, polygon, rect, rotate, svg } from '../src/scene.js';
import { decodePNG, icoImages } from './png-decode.js';

describe('svg', () => {
	it('writes rects and paths', () => {
		const scene = {
			w: 10,
			h: 5,
			label: 'x',
			items: [
				{ fill: '#000000', shape: rect(0, 0, 10, 5) },
				{ fill: '#ffffff', shape: rect(1, 1, 2, 2, 0.5) },
				{ fill: '#ff0000', shape: polygon([0, 0], [1.006, 0], [1, 1]) }
			]
		};
		assert.equal(
			svg(scene),
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 5" width="10" height="5" role="img" aria-label="x">' +
				'<rect x="0" y="0" width="10" height="5" fill="#000000"/>' +
				'<rect x="1" y="1" width="2" height="2" rx="0.5" fill="#ffffff"/>' +
				'<path fill="#ff0000" d="M0 0 L1.01 0 L1 1 Z"/>' +
				'</svg>\n'
		);
	});

	it('normalises negative zero', () => {
		assert.equal(num(-0.001), '0');
	});

	it('rounds negative values away from zero', () => {
		assert.equal(num(-1.125), '-1.13');
	});
});

describe('rotate', () => {
	it('turns counterclockwise for a negative sine', () => {
		const d = Math.SQRT2 / 2;
		const [x, y] = rotate([0, 0], -d, d)([1, 0]);
		assert.ok(Math.abs(x - d) < 1e-9);
		assert.ok(Math.abs(y + d) < 1e-9); // up, since y points down
	});
});

describe('render', () => {
	const scene = { w: 4, h: 4, items: [{ fill: '#ff0000', shape: rect(0, 0, 2, 4) }] };

	it('fills the shape', () => {
		const { pix } = render(scene, 4);
		assert.deepEqual([...pix.subarray(0, 4)], [0xff, 0, 0, 0xff]); // inside
		assert.deepEqual([...pix.subarray(12, 16)], [0, 0, 0, 0]); // outside, transparent
	});

	it('rejects bad colours', () => {
		const bad = { w: 1, h: 1, items: [{ fill: 'red', shape: rect(0, 0, 1, 1) }] };
		assert.throws(() => render(bad, 1), /want #rrggbb/);
	});

	it('antialiases a partly covered pixel', () => {
		const half = { w: 2, h: 1, items: [{ fill: '#000000', shape: rect(0, 0, 0.5, 1) }] };
		const alpha = render(half, 2).pix[3];
		assert.ok(alpha > 0x70 && alpha < 0x90, `alpha ${alpha}`);
	});

	it('fills a quadratic curve', () => {
		const path = [
			{ op: 'M', pts: [[0, 0]] },
			{
				op: 'Q',
				pts: [
					[8, 0],
					[8, 8]
				]
			},
			{ op: 'Z', pts: [] }
		];
		const { pix } = render({ w: 8, h: 8, items: [{ fill: '#000000', shape: path }] }, 8);
		const alphaAt = (x, y) => pix[(y * 8 + x) * 4 + 3];
		assert.equal(alphaAt(6, 4), 0xff); // between the curve and its chord
		assert.equal(alphaAt(6, 0), 0); // outside the curve
	});
});

describe('encodePNG', () => {
	const roundTrip = (scene, px) => decodePNG(encodePNG(render(scene, px)));

	it('round-trips an image with alpha', () => {
		const scene = { w: 4, h: 4, items: [{ fill: '#e8a33d', shape: rect(0, 0, 2, 4) }] };
		const { width, height, pix } = roundTrip(scene, 4);
		assert.deepEqual([width, height], [4, 4]);
		assert.deepEqual([...pix.subarray(0, 4)], [0xe8, 0xa3, 0x3d, 0xff]);
		assert.equal(pix[15], 0);
	});

	it('leaves out the alpha channel of an opaque image', () => {
		const scene = { w: 2, h: 2, items: [{ fill: '#141316', shape: rect(0, 0, 2, 2) }] };
		const data = encodePNG(render(scene, 2));
		assert.equal(data[25], 2); // truecolour without alpha
		assert.deepEqual([...decodePNG(data).pix.subarray(0, 4)], [0x14, 0x13, 0x16, 0xff]);
	});
});

describe('ico', () => {
	const png = (px) => {
		const scene = { w: 1, h: 1, items: [{ fill: '#141316', shape: rect(0, 0, 1, 1) }] };
		return encodePNG(render(scene, px));
	};

	it('points its directory at each image', () => {
		const small = png(16);
		const big = png(32);
		const file = ico(small, big);
		assert.equal(file.readUInt16LE(2), 1); // type: icon
		assert.equal(file.readUInt16LE(4), 2); // count
		assert.equal(file[6], 16);
		assert.equal(file[6 + 16], 32);
		const [first, second] = icoImages(file);
		assert.ok(first.equals(small));
		assert.ok(second.equals(big));
	});

	it('rejects images over 256px', () => {
		assert.throws(() => ico(png(257)), /at most 256px/);
	});
});

describe('logo', () => {
	const colours = { ink: '#0', cream: '#1', creamLip: '#2', amber: '#3', amberLip: '#4' };

	it('names the missing token', () => {
		assert.throws(
			() => coloursFrom([{ name: 'ink', value: '#141316' }]),
			/logo section is missing/
		);
	});

	const bounds = (items) => ({
		minX: Math.min(...items.map(({ shape }) => shape.x)),
		minY: Math.min(...items.map(({ shape }) => shape.y)),
		maxX: Math.max(...items.map(({ shape }) => shape.x + shape.w)),
		maxY: Math.max(...items.map(({ shape }) => shape.y + shape.h))
	});

	it('crops the mark to its artwork', () => {
		const scene = mark({ key: '#1', keyLip: '#2', space: '#3', spaceLip: '#4' });
		assert.equal(scene.w, MARK_W);
		assert.equal(scene.h, MARK_H);
		assert.deepEqual(bounds(scene.items), { minX: 0, minY: 0, maxX: MARK_W, maxY: MARK_H });
	});

	it('centres the mark on a tile', () => {
		const { minX, maxX } = bounds(tile(colours, 0.5, 'x').items.slice(1)); // after the background
		assert.ok(Math.abs((minX + maxX) / 2 - TILE_SIZE / 2) < 1e-9);
		assert.ok(Math.abs(maxX - minX - TILE_SIZE * 0.5) < 1e-9);
	});
});
