// Encodes rasterized images as PNG and packs them into .ico files.
import { crc32, deflateSync, constants } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Parses '#rrggbb' into [r, g, b]. */
export function parseColour(s) {
	if (!/^#[0-9a-fA-F]{6}$/.test(s)) {
		throw new Error(`colour "${s}": want #rrggbb`);
	}
	return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/** Encodes a { width, height, pix } image from render as a PNG. */
export function encodePNG({ width, height, pix }) {
	const opaque = pix.every((v, i) => i % 4 !== 3 || v === 0xff);
	const channels = opaque ? 3 : 4;
	const rows = unpremultiply(pix, width * 4, channels);

	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = opaque ? 2 : 6; // truecolour, with alpha if needed

	const image = deflateSync(filter(rows, width * channels, channels), {
		level: constants.Z_BEST_COMPRESSION
	});
	return Buffer.concat([
		SIGNATURE,
		chunk('IHDR', header),
		chunk('IDAT', image),
		chunk('IEND', Buffer.alloc(0))
	]);
}

// Converts premultiplied RGBA to PNG's straight alpha.
function unpremultiply(pix, stride, channels) {
	const out = new Uint8Array((pix.length / stride) * (stride / 4) * channels);
	for (let i = 0, o = 0; i < pix.length; i += 4, o += channels) {
		const a = pix[i + 3] * 0x101;
		for (let c = 0; c < 3; c++) {
			const v = pix[i + c] * 0x101;
			out[o + c] = a === 0 ? 0 : a === 0xffff ? v >>> 8 : Math.floor((v * 0xffff) / a) >>> 8;
		}
		if (channels === 4) {
			out[o + 3] = pix[i + 3];
		}
	}
	return out;
}

// Prefixes each row with the PNG filter whose output has the smallest absolute sum, the usual
// heuristic for what will compress best.
function filter(pix, stride, bpp) {
	const height = pix.length / stride;
	const out = new Uint8Array((stride + 1) * height);
	const zero = new Uint8Array(stride);
	for (let y = 0; y < height; y++) {
		const row = pix.subarray(y * stride, (y + 1) * stride);
		const prior = y === 0 ? zero : pix.subarray((y - 1) * stride, y * stride);
		let best;
		let bestSum = Infinity;
		for (let type = 0; type < 5; type++) {
			const filtered = applyFilter(type, row, prior, bpp);
			const sum = filtered.reduce((total, v) => total + (v < 128 ? v : 256 - v), 0);
			if (sum < bestSum) {
				best = { type, filtered };
				bestSum = sum;
			}
		}
		const start = y * (stride + 1);
		out[start] = best.type;
		out.set(best.filtered, start + 1);
	}
	return out;
}

function applyFilter(type, row, prior, bpp) {
	return row.map((v, i) => {
		const a = i >= bpp ? row[i - bpp] : 0;
		const b = prior[i];
		const c = i >= bpp ? prior[i - bpp] : 0;
		return v - [0, a, b, (a + b) >> 1, paeth(a, b, c)][type];
	});
}

function paeth(a, b, c) {
	const pa = Math.abs(b - c);
	const pb = Math.abs(a - c);
	const pc = Math.abs(a + b - 2 * c);
	if (pa <= pb && pa <= pc) return a;
	return pb <= pc ? b : c;
}

function chunk(type, data) {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(data.length, 0);
	head.write(type, 4, 'latin1');
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
	return Buffer.concat([head, data, tail]);
}

/** Packs PNG-encoded square images into a .ico file, stored as PNG, which browsers all support. */
export function ico(...images) {
	const directory = Buffer.alloc(6 + 16 * images.length);
	directory.writeUInt16LE(1, 2); // type: icon
	directory.writeUInt16LE(images.length, 4);
	let offset = directory.length;
	images.forEach((data, i) => {
		const width = data.readUInt32BE(16);
		const height = data.readUInt32BE(20);
		if (width !== height || width < 1 || width > 256) {
			throw new Error(`ico image must be square and at most 256px, got ${width}x${height}`);
		}
		const entry = 6 + 16 * i;
		const side = width < 256 ? width : 0; // 0 means 256
		directory[entry] = side;
		directory[entry + 1] = side;
		directory.writeUInt16LE(1, entry + 4); // planes
		directory.writeUInt16LE(32, entry + 6); // bits per pixel
		directory.writeUInt32LE(data.length, entry + 8);
		directory.writeUInt32LE(offset, entry + 12);
		offset += data.length;
	});
	return Buffer.concat([directory, ...images]);
}
