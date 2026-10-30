// Decodes the PNGs dist/ holds, so tests can compare them by pixel: 8-bit truecolour, with or
// without alpha, not interlaced. Returns { width, height, pix } as straight RGBA.
import { inflateSync } from 'node:zlib';

export function decodePNG(data) {
	const width = data.readUInt32BE(16);
	const height = data.readUInt32BE(20);
	const channels = { 2: 3, 6: 4 }[data[25]];
	if (data[24] !== 8 || channels === undefined || data[28] !== 0) {
		throw new Error('unsupported PNG format');
	}

	const idat = [];
	for (let at = 8; at < data.length;) {
		const length = data.readUInt32BE(at);
		if (data.toString('latin1', at + 4, at + 8) === 'IDAT') {
			idat.push(data.subarray(at + 8, at + 8 + length));
		}
		at += 12 + length;
	}

	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const rows = new Uint8Array(stride * height);
	for (let y = 0; y < height; y++) {
		const type = raw[y * (stride + 1)];
		const start = y * (stride + 1) + 1;
		for (let i = 0; i < stride; i++) {
			const a = i >= channels ? rows[y * stride + i - channels] : 0;
			const b = y > 0 ? rows[(y - 1) * stride + i] : 0;
			const c = y > 0 && i >= channels ? rows[(y - 1) * stride + i - channels] : 0;
			rows[y * stride + i] = raw[start + i] + predictor(type, a, b, c);
		}
	}

	const pix = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		for (let c = 0; c < channels; c++) {
			pix[i * 4 + c] = rows[i * channels + c];
		}
		if (channels === 3) {
			pix[i * 4 + 3] = 0xff;
		}
	}
	return { width, height, pix };
}

function predictor(type, a, b, c) {
	switch (type) {
		case 0:
			return 0;
		case 1:
			return a;
		case 2:
			return b;
		case 3:
			return (a + b) >> 1;
		default: {
			const pa = Math.abs(b - c);
			const pb = Math.abs(a - c);
			const pc = Math.abs(a + b - 2 * c);
			if (pa <= pb && pa <= pc) return a;
			return pb <= pc ? b : c;
		}
	}
}

/** The PNG payloads of an .ico file, in directory order. */
export function icoImages(data) {
	const images = [];
	for (let i = 0; i < data.readUInt16LE(4); i++) {
		const size = data.readUInt32LE(6 + 16 * i + 8);
		const offset = data.readUInt32LE(6 + 16 * i + 12);
		images.push(data.subarray(offset, offset + size));
	}
	return images;
}
