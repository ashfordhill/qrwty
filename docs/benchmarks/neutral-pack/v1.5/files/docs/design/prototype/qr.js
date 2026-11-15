/*
 * QRWTY prototype QR encoder: byte mode, error correction level M, versions 1-40, ISO/IEC 18004
 * module placement and mask selection. Classic script (works from file://); defines
 * globalThis.QrwtyQr = { encode, toSvg, toCanvas }.
 * The export rules it implements are the design's: opaque white ground, ink modules, a 4-module
 * quiet zone and whole-pixel modules in PNG. It is a prototype aid, not production code.
 */
(function (root) {
	"use strict";

	const ECC_PER_BLOCK_M = [
		-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
		28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
	];
	const BLOCKS_M = [
		-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
		25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
	];
	const FORMAT_BITS_M = 0;

	const bit = (x, i) => ((x >>> i) & 1) !== 0;

	function rawModules(ver) {
		let n = (16 * ver + 128) * ver + 64;
		if (ver >= 2) {
			const align = Math.floor(ver / 7) + 2;
			n -= (25 * align - 10) * align - 55;
			if (ver >= 7) n -= 36;
		}
		return n;
	}

	const dataCodewords = (ver) =>
		Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK_M[ver] * BLOCKS_M[ver];

	function gfMul(x, y) {
		let z = 0;
		for (let i = 7; i >= 0; i--) {
			z = (z << 1) ^ ((z >>> 7) * 0x11d);
			z ^= ((y >>> i) & 1) * x;
		}
		return z & 0xff;
	}

	function rsDivisor(degree) {
		const result = new Array(degree).fill(0);
		result[degree - 1] = 1;
		let rootVal = 1;
		for (let i = 0; i < degree; i++) {
			for (let j = 0; j < result.length; j++) {
				result[j] = gfMul(result[j], rootVal);
				if (j + 1 < result.length) result[j] ^= result[j + 1];
			}
			rootVal = gfMul(rootVal, 0x02);
		}
		return result;
	}

	function rsRemainder(data, divisor) {
		const result = new Array(divisor.length).fill(0);
		for (const b of data) {
			const factor = b ^ result.shift();
			result.push(0);
			divisor.forEach((coef, i) => {
				result[i] ^= gfMul(coef, factor);
			});
		}
		return result;
	}

	function utf8(text) {
		return Array.from(new TextEncoder().encode(text));
	}

	function encode(text) {
		const bytes = utf8(text);
		let ver = 1;
		for (; ver <= 40; ver++) {
			const countBits = ver <= 9 ? 8 : 16;
			if (4 + countBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
		}
		if (ver > 40) throw new Error("text too long for a QR code");
		const countBits = ver <= 9 ? 8 : 16;
		const bits = [];
		const push = (val, len) => {
			for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
		};
		push(0b0100, 4);
		push(bytes.length, countBits);
		for (const b of bytes) push(b, 8);
		const capacity = dataCodewords(ver) * 8;
		push(0, Math.min(4, capacity - bits.length));
		push(0, (8 - (bits.length % 8)) % 8);
		for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
		const data = [];
		for (let i = 0; i < bits.length; i += 8) {
			let v = 0;
			for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
			data.push(v);
		}

		// Error correction and interleaving.
		const numBlocks = BLOCKS_M[ver];
		const eccLen = ECC_PER_BLOCK_M[ver];
		const rawCodewords = Math.floor(rawModules(ver) / 8);
		const numShort = numBlocks - (rawCodewords % numBlocks);
		const shortLen = Math.floor(rawCodewords / numBlocks);
		const divisor = rsDivisor(eccLen);
		const blocks = [];
		for (let i = 0, k = 0; i < numBlocks; i++) {
			const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
			k += dat.length;
			const ecc = rsRemainder(dat, divisor);
			if (i < numShort) dat.push(0);
			blocks.push(dat.concat(ecc));
		}
		const codewords = [];
		for (let i = 0; i < blocks[0].length; i++) {
			blocks.forEach((block, j) => {
				if (i !== shortLen - eccLen || j >= numShort) codewords.push(block[i]);
			});
		}

		// Module matrix.
		const size = ver * 4 + 17;
		const mods = Array.from({ length: size }, () => new Array(size).fill(false));
		const fn = Array.from({ length: size }, () => new Array(size).fill(false));
		const setFn = (x, y, dark) => {
			mods[y][x] = dark;
			fn[y][x] = true;
		};
		for (let i = 0; i < size; i++) {
			setFn(6, i, i % 2 === 0);
			setFn(i, 6, i % 2 === 0);
		}
		const finder = (cx, cy) => {
			for (let dy = -4; dy <= 4; dy++)
				for (let dx = -4; dx <= 4; dx++) {
					const d = Math.max(Math.abs(dx), Math.abs(dy));
					const x = cx + dx;
					const y = cy + dy;
					if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
				}
		};
		finder(3, 3);
		finder(size - 4, 3);
		finder(3, size - 4);
		const alignPos = [];
		if (ver > 1) {
			const n = Math.floor(ver / 7) + 2;
			const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
			alignPos.push(6);
			for (let pos = size - 7; alignPos.length < n; pos -= step) alignPos.splice(1, 0, pos);
		}
		const na = alignPos.length;
		for (let i = 0; i < na; i++)
			for (let j = 0; j < na; j++) {
				if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
				for (let dy = -2; dy <= 2; dy++)
					for (let dx = -2; dx <= 2; dx++)
						setFn(alignPos[i] + dx, alignPos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
			}
		const drawFormat = (mask) => {
			const d = (FORMAT_BITS_M << 3) | mask;
			let rem = d;
			for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
			const b = ((d << 10) | rem) ^ 0x5412;
			for (let i = 0; i <= 5; i++) setFn(8, i, bit(b, i));
			setFn(8, 7, bit(b, 6));
			setFn(8, 8, bit(b, 7));
			setFn(7, 8, bit(b, 8));
			for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(b, i));
			for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(b, i));
			for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(b, i));
			setFn(8, size - 8, true);
		};
		drawFormat(0);
		if (ver >= 7) {
			let rem = ver;
			for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
			const b = (ver << 12) | rem;
			for (let i = 0; i < 18; i++) {
				const a = size - 11 + (i % 3);
				const c = Math.floor(i / 3);
				setFn(a, c, bit(b, i));
				setFn(c, a, bit(b, i));
			}
		}
		let i = 0;
		for (let right = size - 1; right >= 1; right -= 2) {
			if (right === 6) right = 5;
			for (let vert = 0; vert < size; vert++)
				for (let j = 0; j < 2; j++) {
					const x = right - j;
					const upward = ((right + 1) & 2) === 0;
					const y = upward ? size - 1 - vert : vert;
					if (!fn[y][x] && i < codewords.length * 8) {
						mods[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
						i++;
					}
				}
		}

		const applyMask = (mask) => {
			for (let y = 0; y < size; y++)
				for (let x = 0; x < size; x++) {
					let inv;
					switch (mask) {
						case 0: inv = (x + y) % 2 === 0; break;
						case 1: inv = y % 2 === 0; break;
						case 2: inv = x % 3 === 0; break;
						case 3: inv = (x + y) % 3 === 0; break;
						case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
						case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
						case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
						default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
					}
					if (!fn[y][x] && inv) mods[y][x] = !mods[y][x];
				}
		};
		const penalty = () => {
			let p = 0;
			const line = (get) => {
				for (let a = 0; a < size; a++) {
					let run = 1;
					for (let b = 1; b <= size; b++) {
						if (b < size && get(a, b) === get(a, b - 1)) run++;
						else {
							if (run >= 5) p += 3 + (run - 5);
							run = 1;
						}
					}
					for (let b = 0; b + 11 <= size; b++) {
						const s = [];
						for (let k = 0; k < 11; k++) s.push(get(a, b + k) ? 1 : 0);
						const t = s.join("");
						if (t === "10111010000" || t === "00001011101") p += 40;
					}
				}
			};
			line((a, b) => mods[a][b]);
			line((a, b) => mods[b][a]);
			let dark = 0;
			for (let y = 0; y < size; y++)
				for (let x = 0; x < size; x++) {
					if (mods[y][x]) dark++;
					if (
						x < size - 1 &&
						y < size - 1 &&
						mods[y][x] === mods[y][x + 1] &&
						mods[y][x] === mods[y + 1][x] &&
						mods[y][x] === mods[y + 1][x + 1]
					)
						p += 3;
				}
			const total = size * size;
			p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
			return p;
		};
		let best = 0;
		let bestScore = Infinity;
		for (let m = 0; m < 8; m++) {
			applyMask(m);
			drawFormat(m);
			const s = penalty();
			if (s < bestScore) {
				bestScore = s;
				best = m;
			}
			applyMask(m);
		}
		applyMask(best);
		drawFormat(best);
		return { version: ver, size, mask: best, modules: mods };
	}

	const QUIET = 4;

	/** SVG with an opaque white ground and a 4-module quiet zone; one path, whole modules. */
	function toSvg(qr, { ink = "#071c28", paper = "#ffffff", title = "" } = {}) {
		const dim = qr.size + QUIET * 2;
		let d = "";
		for (let y = 0; y < qr.size; y++) {
			let x = 0;
			while (x < qr.size) {
				if (!qr.modules[y][x]) {
					x++;
					continue;
				}
				let run = 1;
				while (x + run < qr.size && qr.modules[y][x + run]) run++;
				d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
				x += run;
			}
		}
		const t = title ? `<title>${title.replace(/[<&>]/g, "")}</title>` : "";
		return (
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
			`${t}<rect width="${dim}" height="${dim}" fill="${paper}"/><path fill="${ink}" d="${d}"/></svg>`
		);
	}

	/** Draws whole-pixel modules on an opaque canvas no larger than `maxPx`. */
	function toCanvas(qr, canvas, maxPx, { ink = "#071c28", paper = "#ffffff" } = {}) {
		const dim = qr.size + QUIET * 2;
		const scale = Math.max(1, Math.floor(maxPx / dim));
		canvas.width = dim * scale;
		canvas.height = dim * scale;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = paper;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = ink;
		for (let y = 0; y < qr.size; y++)
			for (let x = 0; x < qr.size; x++)
				if (qr.modules[y][x]) ctx.fillRect((x + QUIET) * scale, (y + QUIET) * scale, scale, scale);
		return { px: canvas.width, scale, modules: dim };
	}

	root.QrwtyQr = { encode, toSvg, toCanvas, QUIET };
})(typeof window !== "undefined" ? window : globalThis);
