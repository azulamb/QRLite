var QRLite;
(function (QRLite) {
    const W = 0;
    const B = 1;
    class Byte {
        constructor(bytesize) {
            this.byte = new Uint8Array(bytesize);
            this.wbit = 0;
        }
        size() { return this.byte.length; }
        countByteSize() { return Math.ceil(this.wbit / 8); }
        get() { return this.byte; }
        addBit(...bitarray) {
            bitarray.forEach((bit) => {
                if (bit) {
                    this.byte[Math.floor(this.wbit / 8)] |= 1 << (7 - this.wbit % 8);
                }
                ++this.wbit;
            });
        }
        add0Bit(count) {
            if (count === undefined) {
                count = this.wbit % 8;
            }
            this.wbit += count;
        }
        addByte(data) {
            if (this.wbit % 8 === 0) {
                data.forEach((byte) => {
                    this.byte[Math.floor(this.wbit / 8)] = byte;
                    this.wbit += 8;
                });
                return;
            }
            data.forEach((byte) => {
                this.addBit(byte & 0x80, byte & 0x40, byte & 0x20, byte & 0x10, byte & 0x8, byte & 0x4, byte & 0x2, byte & 0x1);
            });
        }
        addByteNumber(byte) {
            if (this.wbit % 8 === 0) {
                this.byte[Math.floor(this.wbit / 8)] = byte;
                this.wbit += 8;
                return;
            }
            this.addBit(byte & 0x80, byte & 0x40, byte & 0x20, byte & 0x10, byte & 0x8, byte & 0x4, byte & 0x2, byte & 0x1);
        }
    }
    class BitReader {
        constructor(byte) {
            this.byte = byte;
            this.cursor = 0;
        }
        hasNext() { return this.cursor < this.byte.length * 8; }
        getNow() {
            const b = this.byte[Math.floor(this.cursor / 8)];
            return !!(b & (1 << (7 - (this.cursor % 8))));
        }
        getNext() {
            const b = this.byte[Math.floor(this.cursor / 8)];
            return !!(b & (1 << (7 - (this.cursor++ % 8))));
        }
    }
    class MonochromeBitmap {
        output(canvas, frame = 1) {
            const width = canvas.width;
            const height = canvas.height;
            const bitarray = canvas.getPixels();
            const byte = [];
            if (frame <= 0) {
                frame = 0;
            }
            byte.push(0x42, 0x4D);
            byte.push(0, 0, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(...this.numberToLE4Byte(40));
            byte.push(...this.numberToLE4Byte(width + frame * 2));
            byte.push(...this.numberToLE4Byte(height + frame * 2));
            byte.push(1, 0);
            byte.push(1, 0);
            byte.push(0, 0, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(196, 14, 0, 0);
            byte.push(196, 14, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(0, 0, 0, 0);
            byte.push(255, 255, 255, 0);
            const offset = this.numberToLE4Byte(byte.length);
            byte[10] = offset[0];
            byte[11] = offset[1];
            byte[12] = offset[2];
            byte[13] = offset[3];
            for (let y = 0; y < frame; ++y) {
                const length = width + frame * 2;
                let count = 0;
                let x;
                for (x = 0; x < length; x += 8) {
                    ++count;
                    byte.push(255);
                }
                if (length % 8 !== 0) {
                    ++count;
                    x = length % 8;
                    const dot8 = [false, false, false, false, false, false, false, false];
                    for (let i = 0; i < 8; ++i) {
                        dot8[i] = i < x;
                    }
                    byte.push((dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) + (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) + (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0));
                }
                while (count % 4 !== 0) {
                    ++count;
                    byte.push(0);
                }
            }
            for (let y = height - 1; 0 <= y; --y) {
                const dot8 = [false, false, false, false, false, false, false, false];
                let x;
                let count = 0;
                let w = 0;
                for (x = -frame; x < width + frame; ++x) {
                    if (x < 0 || width <= x) {
                        dot8[w] = true;
                    }
                    else {
                        dot8[w] = !bitarray[y * width + x];
                    }
                    if (++w === 8) {
                        ++count;
                        byte.push((dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) + (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) + (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0));
                        dot8[0] = dot8[1] = dot8[2] = dot8[3] = dot8[4] = dot8[5] = dot8[6] = dot8[7] = false;
                        w = 0;
                    }
                }
                if (w % 8 !== 0) {
                    ++count;
                    byte.push((dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) + (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) + (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0));
                }
                while (count % 4 !== 0) {
                    ++count;
                    byte.push(0);
                }
            }
            for (let y = 0; y < frame; ++y) {
                const length = width + frame * 2;
                let count = 0;
                let x;
                for (x = 0; x < length; x += 8) {
                    ++count;
                    byte.push(255);
                }
                if (length % 8 !== 0) {
                    ++count;
                    x = length % 8;
                    const dot8 = [false, false, false, false, false, false, false, false];
                    for (let i = 0; i < 8; ++i) {
                        dot8[i] = i < x;
                    }
                    byte.push((dot8[0] ? 128 : 0) + (dot8[1] ? 64 : 0) + (dot8[2] ? 32 : 0) + (dot8[3] ? 16 : 0) + (dot8[4] ? 8 : 0) + (dot8[5] ? 4 : 0) + (dot8[6] ? 2 : 0) + (dot8[7] ? 1 : 0));
                }
                while (count % 4 !== 0) {
                    ++count;
                    byte.push(0);
                }
            }
            const filesize = this.numberToLE4Byte(byte.length);
            byte[2] = filesize[0];
            byte[3] = filesize[1];
            byte[4] = filesize[2];
            byte[5] = filesize[3];
            const datasize = this.numberToLE4Byte(byte.length - 62);
            byte[34] = datasize[0];
            byte[35] = datasize[1];
            byte[36] = datasize[2];
            byte[37] = datasize[3];
            return byte;
        }
        numberToLE4Byte(data) {
            const byte = [0, 0, 0, 0];
            for (let i = 0; i < 4; ++i) {
                byte[i] = data % 256;
                data = Math.floor(data / 256);
            }
            return byte;
        }
    }
    class BitCanvas {
        constructor(w, h) {
            this.width = w;
            this.height = h;
            this.bitarray = new Array(w * h);
        }
        clone() {
            const canvas = new BitCanvas(this.width, this.height);
            canvas.drawFromBitarray(this.bitarray);
            return canvas;
        }
        reverse(func, mask) {
            for (let i = 0; i < this.bitarray.length; ++i) {
                if (!mask[i] || !func(i % this.width, Math.floor(i / this.width))) {
                    continue;
                }
                this.bitarray[i] = !this.bitarray[i];
            }
            return this;
        }
        getPixel(x, y) {
            if (x < 0 || this.width <= x || y < 0 || this.height <= y) {
                return undefined;
            }
            return this.bitarray[y * this.width + x];
        }
        getPixels() { return this.bitarray; }
        drawPixel(x, y, black) {
            if (x < 0 || this.width <= x || y < 0 || this.height <= y) {
                return;
            }
            this.bitarray[y * this.width + x] = !!black;
            return this;
        }
        drawFromBitarray(bitarray) {
            for (let i = 0; i < bitarray.length && i < this.bitarray.length; ++i) {
                this.bitarray[i] = !!bitarray[i];
            }
            return this;
        }
        isTransparentPixel(x, y) {
            if (x < 0 || this.width <= x || y < 0 || this.height <= y) {
                return false;
            }
            return this.bitarray[y * this.width + x] === undefined;
        }
        drawTimingPattern() {
            for (let x = 0; x < this.width; ++x) {
                this.drawPixel(x, 6, !(x % 2));
            }
            for (let y = 0; y < this.height; ++y) {
                this.drawPixel(6, y, !(y % 2));
            }
            return this;
        }
        drawQRInfo(level, mask) {
            const data = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
            switch (level) {
                case 'L':
                    data[0] = false;
                    data[1] = true;
                    break;
                case 'M':
                    data[0] = false;
                    data[1] = false;
                    break;
                case 'Q':
                    data[0] = true;
                    data[1] = true;
                    break;
                case 'H':
                    data[0] = true;
                    data[1] = false;
                    break;
            }
            switch (mask) {
                case 0:
                    data[2] = false;
                    data[3] = false;
                    data[4] = false;
                    break;
                case 1:
                    data[2] = false;
                    data[3] = false;
                    data[4] = true;
                    break;
                case 2:
                    data[2] = false;
                    data[3] = true;
                    data[4] = false;
                    break;
                case 3:
                    data[2] = false;
                    data[3] = true;
                    data[4] = true;
                    break;
                case 4:
                    data[2] = true;
                    data[3] = false;
                    data[4] = false;
                    break;
                case 5:
                    data[2] = true;
                    data[3] = false;
                    data[4] = true;
                    break;
                case 6:
                    data[2] = true;
                    data[3] = true;
                    data[4] = false;
                    break;
                case 7:
                    data[2] = true;
                    data[3] = true;
                    data[4] = true;
                    break;
            }
            if (level !== undefined && mask !== undefined) {
                const k = [
                    data[0], data[1], data[2], data[3], data[4],
                    false, false, false, false, false, false, false, false, false, false,
                ];
                let a = 0;
                if (data[0]) {
                    a = 4;
                }
                else if (data[1]) {
                    a = 3;
                }
                else if (data[2]) {
                    a = 2;
                }
                else if (data[3]) {
                    a = 1;
                }
                else if (data[4]) {
                    a = 0;
                }
                const g = [true, false, true, false, false, true, true, false, true, true, true];
                for (let i = 0; i < 5; ++i) {
                    if (!k[i]) {
                        continue;
                    }
                    for (let j = 0; j < g.length; ++j) {
                        k[i + j] = k[i + j] !== g[j];
                    }
                }
                for (let i = 5; i < data.length; ++i) {
                    data[i] = k[i];
                }
                data[0] = data[0] !== true;
                data[1] = data[1] !== false;
                data[2] = data[2] !== true;
                data[3] = data[3] !== false;
                data[4] = data[4] !== true;
                data[5] = data[5] !== false;
                data[6] = data[6] !== false;
                data[7] = data[7] !== false;
                data[8] = data[8] !== false;
                data[9] = data[9] !== false;
                data[10] = data[10] !== true;
                data[11] = data[11] !== false;
                data[12] = data[12] !== false;
                data[13] = data[13] !== true;
                data[14] = data[14] !== false;
            }
            this.drawPixel(8, 0, data[14]);
            this.drawPixel(8, 1, data[13]);
            this.drawPixel(8, 2, data[12]);
            this.drawPixel(8, 3, data[11]);
            this.drawPixel(8, 4, data[10]);
            this.drawPixel(8, 5, data[9]);
            this.drawPixel(8, 7, data[8]);
            this.drawPixel(8, 8, data[7]);
            this.drawPixel(7, 8, data[6]);
            this.drawPixel(5, 8, data[5]);
            this.drawPixel(4, 8, data[4]);
            this.drawPixel(3, 8, data[3]);
            this.drawPixel(2, 8, data[2]);
            this.drawPixel(1, 8, data[1]);
            this.drawPixel(0, 8, data[0]);
            this.drawPixel(this.width - 8, 8, data[7]);
            this.drawPixel(this.width - 7, 8, data[8]);
            this.drawPixel(this.width - 6, 8, data[9]);
            this.drawPixel(this.width - 5, 8, data[10]);
            this.drawPixel(this.width - 4, 8, data[11]);
            this.drawPixel(this.width - 3, 8, data[12]);
            this.drawPixel(this.width - 2, 8, data[13]);
            this.drawPixel(this.width - 1, 8, data[14]);
            this.drawPixel(8, this.height - 8, true);
            this.drawPixel(8, this.height - 7, data[6]);
            this.drawPixel(8, this.height - 6, data[5]);
            this.drawPixel(8, this.height - 5, data[4]);
            this.drawPixel(8, this.height - 4, data[3]);
            this.drawPixel(8, this.height - 3, data[2]);
            this.drawPixel(8, this.height - 2, data[1]);
            this.drawPixel(8, this.height - 1, data[0]);
            return this;
        }
        drawFinderPattern(x, y) {
            const pattern = [
                W, W, W, W, W, W, W, W, W,
                W, B, B, B, B, B, B, B, W,
                W, B, W, W, W, W, W, B, W,
                W, B, W, B, B, B, W, B, W,
                W, B, W, B, B, B, W, B, W,
                W, B, W, B, B, B, W, B, W,
                W, B, W, W, W, W, W, B, W,
                W, B, B, B, B, B, B, B, W,
                W, W, W, W, W, W, W, W, W,
            ];
            this.drawPattern(pattern, x, y, 9, 9);
            return this;
        }
        drawAlignmentPattern(x, y) {
            const pattern = [
                B, B, B, B, B,
                B, W, W, W, B,
                B, W, B, W, B,
                B, W, W, W, B,
                B, B, B, B, B,
            ];
            this.drawPattern(pattern, x, y, 5, 5);
            return this;
        }
        drawPattern(pattern, x, y, w, h) {
            for (let b = 0; b < h; ++b) {
                for (let a = 0; a < w; ++a) {
                    this.drawPixel(x + a, y + b, !!pattern[b * w + a]);
                }
            }
            this.drawPixel(8, this.height - 8, false);
            return this;
        }
        drawQRByte(byte, cursor) {
            if (!cursor) {
                cursor = { x: this.width - 1, y: this.height - 1, up: true, right: true };
            }
            const reader = new BitReader(byte);
            while (reader.hasNext()) {
                this.drawPixel(cursor.x - (cursor.right ? 0 : 1), cursor.y, reader.getNext());
                if (cursor.right) {
                    if (this.isTransparentPixel(cursor.x - 1, cursor.y)) {
                        cursor.right = false;
                        continue;
                    }
                    let nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
                    while (nexty < 0) {
                        if (this.noEmptyLine(cursor.x - 2)) {
                            --cursor.x;
                        }
                        cursor.right = true;
                        cursor.up = !cursor.up;
                        cursor.y = cursor.up ? this.height - 1 : 0;
                        cursor.x -= 2;
                        if (cursor.x < 0) {
                            break;
                        }
                        nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
                    }
                    if (cursor.x < 0) {
                        break;
                    }
                    cursor.y = nexty;
                }
                else {
                    cursor.right = true;
                    let nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
                    while (nexty < 0) {
                        if (this.noEmptyLine(cursor.x - 2)) {
                            --cursor.x;
                        }
                        cursor.right = true;
                        cursor.up = !cursor.up;
                        cursor.y = cursor.up ? this.height - 1 : 0;
                        cursor.x -= 2;
                        if (cursor.x < 0) {
                            break;
                        }
                        nexty = this.existsEmpty(cursor.x, cursor.y, cursor.up);
                    }
                    if (cursor.x < 0) {
                        break;
                    }
                    cursor.y = nexty;
                    if (this.isTransparentPixel(cursor.x, cursor.y)) {
                        continue;
                    }
                    cursor.right = false;
                }
            }
            if (reader.hasNext()) {
                console.log('Error: Data overflow!');
            }
            return cursor;
        }
        fillEmpty(color = false) {
            const length = this.width * this.height;
            let count = 0;
            for (let i = 0; i < length; ++i) {
                if (this.bitarray[i] === undefined) {
                    this.bitarray[i] = color;
                    ++count;
                }
            }
            return count;
        }
        existsEmpty(rx, y, up) {
            if (up) {
                for (; 0 <= y; --y) {
                    if (this.isTransparentPixel(rx, y) || this.isTransparentPixel(rx - 1, y)) {
                        return y;
                    }
                }
                return -1;
            }
            for (; y < this.height; ++y) {
                if (this.isTransparentPixel(rx, y) || this.isTransparentPixel(rx - 1, y)) {
                    return y;
                }
            }
            return -1;
        }
        noEmptyLine(x) {
            for (let y = 0; y < this.height; ++y) {
                if (this.isTransparentPixel(x, y)) {
                    return false;
                }
            }
            return true;
        }
        print(white = '██', black = '  ', none = '--') {
            for (let y = 0; y < this.height; ++y) {
                const line = [];
                for (let x = 0; x < this.width; ++x) {
                    line.push(this.bitarray[y * this.height + x] === undefined ? none : (this.bitarray[y * this.height + x] ? black : white));
                }
                console.log(line.join(''));
            }
        }
        outputBitmapByte(frame = 1) {
            const bitmap = new MonochromeBitmap();
            return bitmap.output(this, frame);
        }
    }
    QRLite.BitCanvas = BitCanvas;
    class DefaultRating {
        calc(canvas) {
            const bitarray = canvas.getPixels();
            let point = 0;
            this.sameBitarrayLines(bitarray, canvas.width, canvas.height).forEach((length) => {
                point += 3 + length - 5;
            });
            point += this.count2x2Blocks(bitarray, canvas.width, canvas.height) * 3;
            if (this.existsBadPattern(bitarray, canvas.width, canvas.height)) {
                point += 40;
            }
            const black = this.countBitarray(bitarray, false);
            const per = Math.floor(black * 100 / bitarray.length);
            let k = Math.abs(per - 50);
            while (5 <= k) {
                point += 10;
                k -= 5;
            }
            return point;
        }
        sameBitarrayLines(bitarray, width, height) {
            const lines = [];
            for (let y = 0; y < height; ++y) {
                let color = bitarray[y * width];
                let count = 1;
                for (let x = 1; x < width; ++x) {
                    if (bitarray[y * width + x] === color) {
                        ++count;
                        continue;
                    }
                    if (5 <= count) {
                        lines.push(count);
                    }
                    color = bitarray[y * width + x];
                    count = 1;
                }
            }
            for (let x = 0; x < width; ++x) {
                let color = bitarray[x];
                let count = 1;
                for (let y = 1; y < height; ++y) {
                    if (bitarray[y * width + x] === color) {
                        ++count;
                        continue;
                    }
                    if (5 <= count) {
                        lines.push(count);
                    }
                    color = bitarray[y * width + x];
                    count = 1;
                }
            }
            return lines;
        }
        count2x2Blocks(bitarray, width, height) {
            let count = 0;
            for (let y = 1; y < height; ++y) {
                for (let x = 1; x < width; ++x) {
                    if (bitarray[y * width + x - 1] === bitarray[y * width + x] &&
                        bitarray[(y - 1) * width + x] === bitarray[y * width + x] &&
                        bitarray[(y - 1) * width + x - 1] === bitarray[y * width + x]) {
                        ++count;
                    }
                }
            }
            return count;
        }
        existsBadPattern(bitarray, width, height) {
            const bad = [false, true, false, false, false, true, false];
            for (let y = 0; y < height; ++y) {
                let s = 0;
                for (let x = 0; x < width; ++x) {
                    if (bitarray[y * width + x] === bad[s]) {
                        ++s;
                        if (bad.length <= s) {
                            if (9 < x && bitarray[y * width + x - 7] && bitarray[y * width + x - 6] && bitarray[y * width + x - 5] && bitarray[y * width + x - 4]) {
                                return true;
                            }
                            if (x + 4 < width && bitarray[y * width + x + 1] && bitarray[y * width + x + 2] && bitarray[y * width + x + 3] && bitarray[y * width + x + 4]) {
                                return true;
                            }
                        }
                    }
                    else {
                        s = (bitarray[y * width + x] === bad[s]) ? 1 : 0;
                    }
                }
            }
            for (let x = 0; x < width; ++x) {
                let s = 0;
                for (let y = 0; y < height; ++y) {
                    if (bitarray[y * width + x] === bad[s]) {
                        ++s;
                        if (bad.length <= s) {
                            if (9 < y && bitarray[(y - 7) * width + x] && bitarray[(y - 6) * width + x] && bitarray[(y - 5) * width + x] && bitarray[(y - 4) * width + x]) {
                                return true;
                            }
                            if (y + 4 < width && bitarray[(y + 1) * width + x] && bitarray[(y + 2) * width + x] && bitarray[(y + 3) * width + x] && bitarray[(y + 4) * width + x]) {
                                return true;
                            }
                        }
                    }
                    else {
                        s = (bitarray[y * width + x] === bad[s]) ? 1 : 0;
                    }
                }
            }
            return false;
        }
        countBitarray(bitarray, target) {
            let count = 0;
            for (let i = 0; i < bitarray.length; ++i) {
                if (bitarray[i] === target) {
                    ++count;
                }
            }
            return count;
        }
    }
    class Generator {
        constructor() {
            this.level = 'Q';
            this.version = 0;
            this.setRating();
        }
        get() { return this.canvas; }
        getLevel() { return this.level; }
        setLevel(level) {
            if (level !== 'L' && level !== 'M' && level !== 'Q' && level !== 'H') {
                level = 'Q';
            }
            this.level = level;
            return this.level;
        }
        getVersion() { return this.version; }
        setRating(rating) { this.rating = rating || new DefaultRating(); }
        setData(data) {
            this.rawdata = (typeof data === 'string') ? this.convertStringByte(data) : data;
            this.version = this.searchVersion(data.length, this.level);
            if (this.version <= 0) {
                return null;
            }
            const w = 17 + this.version * 4;
            const h = w;
            this.canvas = new BitCanvas(w, h);
            this.canvas.drawQRInfo();
            this.canvas.drawTimingPattern();
            this.canvas.drawFinderPattern(-1, -1);
            this.canvas.drawFinderPattern(w - 8, -1);
            this.canvas.drawFinderPattern(-1, h - 8);
            if (QRLite.INFO.Data[this.version].Alignment) {
                QRLite.INFO.Data[this.version].Alignment.forEach((pos) => {
                    this.canvas.drawAlignmentPattern(pos.x, pos.y);
                });
            }
            this.mask = this.convertMask(this.canvas);
            return this.rawdata;
        }
        createDataCode() {
            const blocks = this.createDataBlock(this.level, this.version, this.rawdata);
            const ecblocks = this.createECBlock(this.level, this.version, blocks);
            const datacode = [];
            datacode.push(this.interleaveArrays(blocks));
            datacode.push(this.interleaveArrays(ecblocks));
            return datacode;
        }
        drawData(data, ec) {
            const cursor = this.canvas.drawQRByte(data);
            this.canvas.drawQRByte(ec, cursor);
            this.canvas.fillEmpty();
        }
        createMaskedQRCode() {
            const masked = [];
            for (let masknum = 0; masknum < 8; ++masknum) {
                masked.push(this.canvas.clone().reverse(QRLite.INFO.Mask[masknum], this.mask));
            }
            masked.forEach((qrcode, masknum) => {
                qrcode.drawQRInfo(this.level, masknum);
            });
            return masked;
        }
        evaluateQRCode(qrcodes) {
            return qrcodes.map((canvas) => { return this.rating.calc(canvas); });
        }
        selectQRCode(qrcodes) {
            const points = this.evaluateQRCode(qrcodes);
            let masknum = 0;
            let minpoint = points[0];
            for (let i = 1; i < points.length; ++i) {
                if (points[i] < minpoint) {
                    masknum = i;
                    minpoint = points[i];
                }
            }
            return masknum;
        }
        convert(datastr, level) {
            const newlevel = this.setLevel(level || this.level);
            this.setData(datastr);
            const datacode = this.createDataCode();
            this.drawData(datacode[0], datacode[1]);
            const masked = this.createMaskedQRCode();
            const masknum = this.selectQRCode(masked);
            return masked[masknum];
        }
        createDataBlock(level, version, data) {
            const byte = new Byte(QRLite.INFO.Data[version][level].DataCode);
            byte.addBit(0, 1, 0, 0);
            byte.addBit(...this.calcLengthBitarray(data.length, version, level));
            byte.addByte(data);
            byte.addBit(0, 0, 0, 0);
            byte.add0Bit();
            for (let i = byte.countByteSize(); i < byte.size(); ++i) {
                byte.addByteNumber(236);
                if (byte.size() <= ++i) {
                    break;
                }
                byte.addByteNumber(17);
            }
            return this.spritDataBlock(byte.get(), QRLite.INFO.Data[version][level].RS);
        }
        createECBlock(level, version, blocks) {
            const countEC = this.countErrorCode(version, level);
            const g = QRLite.INFO.G[countEC];
            return blocks.map((block) => {
                let f = [];
                const ecblock = new Uint8Array(countEC);
                let count = ecblock.length + block.length;
                block.forEach((num, i) => {
                    f.push({ k: num, x: --count });
                });
                while (0 < count) {
                    f.push({ k: 0, x: --count });
                }
                for (let i = 0; i < block.length; ++i) {
                    const k = QRLite.INFO.ItoE[f[i].k];
                    const px = f[i].x - g[0].x;
                    const gax = g.map((v, index) => {
                        const e = (k + v.a) % 255;
                        return { k: QRLite.INFO.ItoE.indexOf(e), x: v.x + px };
                    });
                    f = f.map((v, index) => {
                        if (index < i) {
                            return { k: 0, x: v.x };
                        }
                        return { k: (gax[index - i] ? v.k ^ gax[index - i].k : 0), x: v.x };
                    });
                }
                for (let i = 0; i < ecblock.length; ++i) {
                    ecblock[i] = f[i + block.length].k;
                }
                return ecblock;
            });
        }
        convertStringByte(data) {
            return (new Uint8Array(data.split('').map((c) => {
                return c.charCodeAt(0);
            })));
        }
        searchVersion(datasize, level) {
            const versions = Object.keys(QRLite.INFO.Data);
            for (let i = 0; i < versions.length; ++i) {
                if (datasize < QRLite.INFO.Data[parseInt(versions[i])][level].Size) {
                    return parseInt(versions[i]);
                }
            }
            return 0;
        }
        calcLengthBitarray(datasize, version, level) {
            const bitlen = 8;
            const byte = [];
            for (let i = bitlen - 1; 0 <= i; --i) {
                byte[i] = datasize % 2;
                datasize = Math.floor(datasize / 2);
            }
            return byte;
        }
        spritDataBlock(byte, rsblocks) {
            const blocks = [];
            let begin = 0;
            rsblocks.forEach((info) => {
                for (let i = 0; i < info.count; ++i) {
                    blocks.push(byte.slice(begin, begin + info.block[1]));
                    begin += info.block[1];
                }
            });
            return blocks;
        }
        countErrorCode(version, level) {
            const code = QRLite.INFO.Data[version][level].ECCode;
            let count = 0;
            QRLite.INFO.Data[version][level].RS.forEach((block) => {
                count += block.count;
            });
            return Math.floor(code / count);
        }
        interleaveArrays(list) {
            const size = list.map((v) => { return v.length; }).reduce((prev, current) => { return prev + current; });
            const byte = new Uint8Array(size);
            const length = list[list.length - 1].length;
            let count = 0;
            for (let i = 0; i < length; ++i) {
                for (let a = 0; a < list.length; ++a) {
                    if (list[a].length <= i) {
                        continue;
                    }
                    byte[count++] = list[a][i];
                }
            }
            return byte;
        }
        convertMask(canvas) {
            const _mask = canvas.getPixels();
            const mask = [];
            for (let i = 0; i < _mask.length; ++i) {
                mask.push(_mask[i] === undefined);
            }
            return mask;
        }
    }
    QRLite.Generator = Generator;
    function convert(data, level = 'Q') {
        const qr = new Generator();
        return qr.convert(data, level);
    }
    QRLite.convert = convert;
    QRLite.INFO = {
        Data: {
            1: {
                L: {
                    DataCode: 19, ECCode: 7, Size: 17,
                    RS: [{ count: 1, block: [26, 19, 2] }],
                },
                M: {
                    DataCode: 16, ECCode: 10, Size: 14,
                    RS: [{ count: 1, block: [26, 16, 4] }],
                },
                Q: {
                    DataCode: 13, ECCode: 13, Size: 11,
                    RS: [{ count: 1, block: [26, 13, 6] }],
                },
                H: {
                    DataCode: 9, ECCode: 17, Size: 7,
                    RS: [{ count: 1, block: [26, 9, 8] }],
                },
                Alignment: [],
            },
            2: {
                L: {
                    DataCode: 34, ECCode: 10, Size: 32,
                    RS: [{ count: 1, block: [44, 34, 4] }],
                },
                M: {
                    DataCode: 28, ECCode: 16, Size: 26,
                    RS: [{ count: 1, block: [44, 28, 8] }],
                },
                Q: {
                    DataCode: 22, ECCode: 22, Size: 20,
                    RS: [{ count: 1, block: [44, 22, 11] }],
                },
                H: {
                    DataCode: 16, ECCode: 28, Size: 14,
                    RS: [{ count: 1, block: [44, 16, 14] }],
                },
                Alignment: [{ x: 16, y: 16 }],
            },
            3: {
                L: {
                    DataCode: 55, ECCode: 15, Size: 53,
                    RS: [{ count: 1, block: [70, 55, 7] }],
                },
                M: {
                    DataCode: 44, ECCode: 26, Size: 42,
                    RS: [{ count: 1, block: [70, 44, 13] }],
                },
                Q: {
                    DataCode: 34, ECCode: 36, Size: 32,
                    RS: [{ count: 2, block: [35, 17, 9] }],
                },
                H: {
                    DataCode: 26, ECCode: 44, Size: 24,
                    RS: [{ count: 2, block: [35, 13, 11] }],
                },
                Alignment: [{ x: 20, y: 20 }],
            },
            4: {
                L: {
                    DataCode: 80, ECCode: 20, Size: 78,
                    RS: [{ count: 1, block: [100, 80, 10] }],
                },
                M: {
                    DataCode: 64, ECCode: 36, Size: 62,
                    RS: [{ count: 2, block: [50, 32, 9] }],
                },
                Q: {
                    DataCode: 48, ECCode: 52, Size: 46,
                    RS: [{ count: 2, block: [50, 24, 13] }],
                },
                H: {
                    DataCode: 36, ECCode: 64, Size: 34,
                    RS: [{ count: 4, block: [25, 9, 8] }],
                },
                Alignment: [{ x: 24, y: 24 }],
            },
            5: {
                L: {
                    DataCode: 108, ECCode: 26, Size: 106,
                    RS: [{ count: 1, block: [134, 108, 13] }],
                },
                M: {
                    DataCode: 86, ECCode: 48, Size: 84,
                    RS: [{ count: 2, block: [67, 43, 12] }],
                },
                Q: {
                    DataCode: 62, ECCode: 72, Size: 60,
                    RS: [{ count: 2, block: [33, 15, 9] }, { count: 2, block: [34, 16, 9] }],
                },
                H: {
                    DataCode: 46, ECCode: 88, Size: 44,
                    RS: [{ count: 2, block: [33, 11, 11] }, { count: 2, block: [34, 12, 11] }],
                },
                Alignment: [{ x: 28, y: 28 }],
            },
            6: {
                L: {
                    DataCode: 136, ECCode: 36, Size: 134,
                    RS: [{ count: 2, block: [86, 68, 9] }],
                },
                M: {
                    DataCode: 108, ECCode: 64, Size: 106,
                    RS: [{ count: 4, block: [43, 27, 8] }],
                },
                Q: {
                    DataCode: 76, ECCode: 96, Size: 74,
                    RS: [{ count: 4, block: [43, 19, 12] }],
                },
                H: {
                    DataCode: 60, ECCode: 112, Size: 58,
                    RS: [{ count: 4, block: [43, 15, 14] }],
                },
                Alignment: [{ x: 32, y: 32 }],
            },
            7: {
                L: {
                    DataCode: 156, ECCode: 40, Size: 154,
                    RS: [{ count: 2, block: [98, 78, 10] }],
                },
                M: {
                    DataCode: 124, ECCode: 72, Size: 122,
                    RS: [{ count: 4, block: [49, 31, 9] }],
                },
                Q: {
                    DataCode: 88, ECCode: 108, Size: 86,
                    RS: [{ count: 2, block: [32, 14, 9] }, { count: 4, block: [33, 15, 9] }],
                },
                H: {
                    DataCode: 66, ECCode: 130, Size: 64,
                    RS: [{ count: 4, block: [39, 13, 13] }, { count: 1, block: [40, 14, 13] }],
                },
                Alignment: [{ x: 20, y: 4 }, { x: 4, y: 20 }, { x: 20, y: 20 }, { x: 36, y: 20 }, { x: 20, y: 36 }, { x: 36, y: 36 }],
            },
            8: {
                L: {
                    DataCode: 194, ECCode: 48, Size: 192,
                    RS: [{ count: 2, block: [121, 97, 12] }],
                },
                M: {
                    DataCode: 154, ECCode: 88, Size: 152,
                    RS: [{ count: 2, block: [60, 38, 11] }, { count: 2, block: [61, 39, 11] }],
                },
                Q: {
                    DataCode: 110, ECCode: 132, Size: 108,
                    RS: [{ count: 4, block: [40, 18, 11] }, { count: 2, block: [41, 19, 11] }],
                },
                H: {
                    DataCode: 86, ECCode: 156, Size: 84,
                    RS: [{ count: 4, block: [40, 14, 13] }, { count: 2, block: [41, 15, 13] }],
                },
                Alignment: [{ x: 22, y: 4 }, { x: 4, y: 22 }, { x: 22, y: 22 }, { x: 40, y: 22 }, { x: 22, y: 40 }, { x: 40, y: 40 }],
            },
            9: {
                L: {
                    DataCode: 232, ECCode: 60, Size: 230,
                    RS: [{ count: 2, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 182, ECCode: 110, Size: 180,
                    RS: [{ count: 3, block: [58, 36, 11] }, { count: 2, block: [59, 37, 11] }],
                },
                Q: {
                    DataCode: 132, ECCode: 160, Size: 130,
                    RS: [{ count: 4, block: [36, 16, 10] }, { count: 4, block: [37, 17, 10] }],
                },
                H: {
                    DataCode: 100, ECCode: 192, Size: 98,
                    RS: [{ count: 4, block: [36, 12, 12] }, { count: 4, block: [37, 13, 12] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 44, y: 24 }, { x: 24, y: 44 }, { x: 44, y: 44 }],
            },
            10: {
                L: {
                    DataCode: 274, ECCode: 72, Size: 271,
                    RS: [{ count: 2, block: [86, 68, 9] }, { count: 2, block: [87, 69, 9] }],
                },
                M: {
                    DataCode: 216, ECCode: 130, Size: 213,
                    RS: [{ count: 4, block: [69, 43, 13] }, { count: 1, block: [70, 44, 13] }],
                },
                Q: {
                    DataCode: 154, ECCode: 192, Size: 151,
                    RS: [{ count: 6, block: [43, 19, 12] }, { count: 2, block: [44, 20, 12] }],
                },
                H: {
                    DataCode: 122, ECCode: 224, Size: 119,
                    RS: [{ count: 6, block: [43, 15, 14] }, { count: 2, block: [44, 16, 14] }],
                },
                Alignment: [{ x: 26, y: 4 }, { x: 4, y: 26 }, { x: 26, y: 26 }, { x: 48, y: 26 }, { x: 26, y: 48 }, { x: 48, y: 48 }],
            },
            11: {
                L: {
                    DataCode: 324, ECCode: 80, Size: 321,
                    RS: [{ count: 4, block: [101, 81, 10] }],
                },
                M: {
                    DataCode: 254, ECCode: 150, Size: 251,
                    RS: [{ count: 1, block: [80, 50, 15] }, { count: 4, block: [81, 51, 15] }],
                },
                Q: {
                    DataCode: 180, ECCode: 224, Size: 177,
                    RS: [{ count: 4, block: [50, 22, 14] }, { count: 4, block: [51, 23, 14] }],
                },
                H: {
                    DataCode: 140, ECCode: 264, Size: 137,
                    RS: [{ count: 3, block: [36, 12, 12] }, { count: 8, block: [37, 13, 12] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 52, y: 28 }, { x: 28, y: 52 }, { x: 52, y: 52 }],
            },
            12: {
                L: {
                    DataCode: 370, ECCode: 96, Size: 367,
                    RS: [{ count: 2, block: [116, 92, 12] }, { count: 2, block: [117, 93, 12] }],
                },
                M: {
                    DataCode: 290, ECCode: 176, Size: 287,
                    RS: [{ count: 6, block: [58, 36, 11] }, { count: 2, block: [59, 37, 11] }],
                },
                Q: {
                    DataCode: 206, ECCode: 260, Size: 203,
                    RS: [{ count: 4, block: [46, 20, 13] }, { count: 6, block: [47, 21, 13] }],
                },
                H: {
                    DataCode: 158, ECCode: 308, Size: 155,
                    RS: [{ count: 7, block: [42, 14, 14] }, { count: 4, block: [43, 15, 14] }],
                },
                Alignment: [{ x: 30, y: 4 }, { x: 4, y: 30 }, { x: 30, y: 30 }, { x: 56, y: 30 }, { x: 30, y: 56 }, { x: 56, y: 56 }],
            },
            13: {
                L: {
                    DataCode: 428, ECCode: 104, Size: 425,
                    RS: [{ count: 4, block: [133, 107, 13] }],
                },
                M: {
                    DataCode: 334, ECCode: 198, Size: 331,
                    RS: [{ count: 8, block: [59, 37, 11] }, { count: 1, block: [60, 38, 11] }],
                },
                Q: {
                    DataCode: 244, ECCode: 288, Size: 241,
                    RS: [{ count: 8, block: [44, 20, 12] }, { count: 4, block: [45, 21, 12] }],
                },
                H: {
                    DataCode: 180, ECCode: 352, Size: 177,
                    RS: [{ count: 12, block: [33, 11, 11] }, { count: 4, block: [34, 12, 11] }],
                },
                Alignment: [{ x: 32, y: 4 }, { x: 4, y: 32 }, { x: 32, y: 32 }, { x: 60, y: 32 }, { x: 32, y: 60 }, { x: 60, y: 60 }],
            },
            14: {
                L: {
                    DataCode: 461, ECCode: 120, Size: 458,
                    RS: [{ count: 3, block: [145, 115, 15] }, { count: 1, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 365, ECCode: 216, Size: 362,
                    RS: [{ count: 4, block: [64, 40, 12] }, { count: 5, block: [65, 41, 12] }],
                },
                Q: {
                    DataCode: 261, ECCode: 320, Size: 258,
                    RS: [{ count: 11, block: [36, 16, 10] }, { count: 5, block: [37, 17, 10] }],
                },
                H: {
                    DataCode: 197, ECCode: 384, Size: 194,
                    RS: [{ count: 11, block: [36, 12, 12] }, { count: 5, block: [37, 13, 12] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 44, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 44, y: 24 }, { x: 64, y: 24 }, { x: 4, y: 44 }, { x: 24, y: 44 }, { x: 44, y: 44 }, { x: 64, y: 44 }, { x: 24, y: 64 }, { x: 44, y: 64 }, { x: 64, y: 64 }],
            },
            15: {
                L: {
                    DataCode: 523, ECCode: 132, Size: 520,
                    RS: [{ count: 5, block: [109, 87, 11] }, { count: 1, block: [110, 88, 11] }],
                },
                M: {
                    DataCode: 415, ECCode: 240, Size: 412,
                    RS: [{ count: 5, block: [65, 41, 12] }, { count: 5, block: [66, 42, 12] }],
                },
                Q: {
                    DataCode: 295, ECCode: 360, Size: 292,
                    RS: [{ count: 5, block: [54, 24, 15] }, { count: 7, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 223, ECCode: 432, Size: 220,
                    RS: [{ count: 11, block: [36, 12, 12] }, { count: 7, block: [37, 13, 12] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 46, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 46, y: 24 }, { x: 68, y: 24 }, { x: 4, y: 46 }, { x: 24, y: 46 }, { x: 46, y: 46 }, { x: 68, y: 46 }, { x: 24, y: 68 }, { x: 46, y: 68 }, { x: 68, y: 68 }],
            },
            16: {
                L: {
                    DataCode: 589, ECCode: 144, Size: 586,
                    RS: [{ count: 5, block: [122, 98, 12] }, { count: 1, block: [123, 99, 12] }],
                },
                M: {
                    DataCode: 453, ECCode: 280, Size: 450,
                    RS: [{ count: 7, block: [73, 45, 14] }, { count: 3, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 325, ECCode: 408, Size: 322,
                    RS: [{ count: 15, block: [43, 19, 12] }, { count: 2, block: [44, 20, 12] }],
                },
                H: {
                    DataCode: 253, ECCode: 480, Size: 250,
                    RS: [{ count: 3, block: [45, 15, 15] }, { count: 13, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 48, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 48, y: 24 }, { x: 72, y: 24 }, { x: 4, y: 48 }, { x: 24, y: 48 }, { x: 48, y: 48 }, { x: 72, y: 48 }, { x: 24, y: 72 }, { x: 48, y: 72 }, { x: 72, y: 72 }],
            },
            17: {
                L: {
                    DataCode: 647, ECCode: 168, Size: 644,
                    RS: [{ count: 1, block: [135, 107, 14] }, { count: 5, block: [136, 108, 14] }],
                },
                M: {
                    DataCode: 507, ECCode: 308, Size: 504,
                    RS: [{ count: 10, block: [74, 46, 14] }, { count: 1, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 367, ECCode: 448, Size: 364,
                    RS: [{ count: 1, block: [50, 22, 14] }, { count: 15, block: [51, 23, 14] }],
                },
                H: {
                    DataCode: 283, ECCode: 532, Size: 280,
                    RS: [{ count: 2, block: [42, 14, 14] }, { count: 17, block: [43, 15, 14] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 52, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 52, y: 28 }, { x: 76, y: 28 }, { x: 4, y: 52 }, { x: 28, y: 52 }, { x: 52, y: 52 }, { x: 76, y: 52 }, { x: 28, y: 76 }, { x: 52, y: 76 }, { x: 76, y: 76 }],
            },
            18: {
                L: {
                    DataCode: 721, ECCode: 180, Size: 718,
                    RS: [{ count: 5, block: [150, 120, 15] }, { count: 1, block: [151, 121, 15] }],
                },
                M: {
                    DataCode: 563, ECCode: 338, Size: 560,
                    RS: [{ count: 9, block: [69, 43, 13] }, { count: 4, block: [70, 44, 13] }],
                },
                Q: {
                    DataCode: 397, ECCode: 504, Size: 394,
                    RS: [{ count: 17, block: [50, 22, 14] }, { count: 1, block: [51, 23, 14] }],
                },
                H: {
                    DataCode: 313, ECCode: 588, Size: 310,
                    RS: [{ count: 2, block: [42, 14, 14] }, { count: 19, block: [43, 15, 14] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 54, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 54, y: 28 }, { x: 80, y: 28 }, { x: 4, y: 54 }, { x: 28, y: 54 }, { x: 54, y: 54 }, { x: 80, y: 54 }, { x: 28, y: 80 }, { x: 54, y: 80 }, { x: 80, y: 80 }],
            },
            19: {
                L: {
                    DataCode: 795, ECCode: 196, Size: 792,
                    RS: [{ count: 3, block: [141, 113, 14] }, { count: 4, block: [142, 114, 14] }],
                },
                M: {
                    DataCode: 627, ECCode: 364, Size: 624,
                    RS: [{ count: 3, block: [70, 44, 13] }, { count: 11, block: [71, 45, 13] }],
                },
                Q: {
                    DataCode: 445, ECCode: 546, Size: 442,
                    RS: [{ count: 17, block: [47, 21, 13] }, { count: 4, block: [48, 22, 13] }],
                },
                H: {
                    DataCode: 341, ECCode: 650, Size: 338,
                    RS: [{ count: 9, block: [39, 13, 13] }, { count: 16, block: [40, 14, 13] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 56, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 56, y: 28 }, { x: 84, y: 28 }, { x: 4, y: 56 }, { x: 28, y: 56 }, { x: 56, y: 56 }, { x: 84, y: 56 }, { x: 28, y: 84 }, { x: 56, y: 84 }, { x: 84, y: 84 }],
            },
            20: {
                L: {
                    DataCode: 861, ECCode: 224, Size: 858,
                    RS: [{ count: 3, block: [135, 107, 14] }, { count: 5, block: [136, 108, 14] }],
                },
                M: {
                    DataCode: 669, ECCode: 416, Size: 666,
                    RS: [{ count: 3, block: [67, 41, 13] }, { count: 13, block: [68, 42, 13] }],
                },
                Q: {
                    DataCode: 485, ECCode: 600, Size: 482,
                    RS: [{ count: 15, block: [54, 24, 15] }, { count: 5, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 385, ECCode: 700, Size: 382,
                    RS: [{ count: 15, block: [43, 15, 14] }, { count: 10, block: [44, 16, 14] }],
                },
                Alignment: [{ x: 32, y: 4 }, { x: 60, y: 4 }, { x: 4, y: 32 }, { x: 32, y: 32 }, { x: 60, y: 32 }, { x: 88, y: 32 }, { x: 4, y: 60 }, { x: 32, y: 60 }, { x: 60, y: 60 }, { x: 88, y: 60 }, { x: 32, y: 88 }, { x: 60, y: 88 }, { x: 88, y: 88 }],
            },
            21: {
                L: {
                    DataCode: 932, ECCode: 224, Size: 929,
                    RS: [{ count: 4, block: [144, 116, 14] }, { count: 4, block: [145, 117, 14] }],
                },
                M: {
                    DataCode: 714, ECCode: 442, Size: 711,
                    RS: [{ count: 17, block: [68, 42, 13] }],
                },
                Q: {
                    DataCode: 512, ECCode: 644, Size: 509,
                    RS: [{ count: 17, block: [50, 22, 14] }, { count: 6, block: [51, 23, 14] }],
                },
                H: {
                    DataCode: 406, ECCode: 750, Size: 403,
                    RS: [{ count: 19, block: [46, 16, 15] }, { count: 6, block: [47, 17, 15] }],
                },
                Alignment: [{ x: 26, y: 4 }, { x: 48, y: 4 }, { x: 70, y: 4 }, { x: 4, y: 26 }, { x: 26, y: 26 }, { x: 48, y: 26 }, { x: 70, y: 26 }, { x: 92, y: 26 }, { x: 4, y: 48 }, { x: 26, y: 48 }, { x: 48, y: 48 }, { x: 70, y: 48 }, { x: 92, y: 48 }, { x: 4, y: 70 }, { x: 26, y: 70 }, { x: 48, y: 70 }, { x: 70, y: 70 }, { x: 92, y: 70 }, { x: 26, y: 92 }, { x: 48, y: 92 }, { x: 70, y: 92 }, { x: 92, y: 92 }],
            },
            22: {
                L: {
                    DataCode: 1006, ECCode: 252, Size: 1003,
                    RS: [{ count: 2, block: [139, 111, 14] }, { count: 7, block: [140, 112, 14] }],
                },
                M: {
                    DataCode: 782, ECCode: 476, Size: 779,
                    RS: [{ count: 17, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 568, ECCode: 690, Size: 565,
                    RS: [{ count: 7, block: [54, 24, 15] }, { count: 16, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 442, ECCode: 816, Size: 439,
                    RS: [{ count: 34, block: [37, 13, 12] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 48, y: 4 }, { x: 72, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 48, y: 24 }, { x: 72, y: 24 }, { x: 96, y: 24 }, { x: 4, y: 48 }, { x: 24, y: 48 }, { x: 48, y: 48 }, { x: 72, y: 48 }, { x: 96, y: 48 }, { x: 4, y: 72 }, { x: 24, y: 72 }, { x: 48, y: 72 }, { x: 72, y: 72 }, { x: 96, y: 72 }, { x: 24, y: 96 }, { x: 48, y: 96 }, { x: 72, y: 96 }, { x: 96, y: 96 }],
            },
            23: {
                L: {
                    DataCode: 1094, ECCode: 270, Size: 1091,
                    RS: [{ count: 4, block: [151, 121, 15] }, { count: 5, block: [152, 122, 15] }],
                },
                M: {
                    DataCode: 860, ECCode: 504, Size: 857,
                    RS: [{ count: 4, block: [75, 47, 14] }, { count: 14, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 614, ECCode: 750, Size: 611,
                    RS: [{ count: 11, block: [54, 24, 15] }, { count: 14, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 464, ECCode: 900, Size: 461,
                    RS: [{ count: 16, block: [45, 15, 15] }, { count: 14, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 52, y: 4 }, { x: 76, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 52, y: 28 }, { x: 76, y: 28 }, { x: 100, y: 28 }, { x: 4, y: 52 }, { x: 28, y: 52 }, { x: 52, y: 52 }, { x: 76, y: 52 }, { x: 100, y: 52 }, { x: 4, y: 76 }, { x: 28, y: 76 }, { x: 52, y: 76 }, { x: 76, y: 76 }, { x: 100, y: 76 }, { x: 28, y: 100 }, { x: 52, y: 100 }, { x: 76, y: 100 }, { x: 100, y: 100 }],
            },
            24: {
                L: {
                    DataCode: 1174, ECCode: 300, Size: 1171,
                    RS: [{ count: 6, block: [147, 117, 15] }, { count: 4, block: [148, 118, 15] }],
                },
                M: {
                    DataCode: 914, ECCode: 560, Size: 911,
                    RS: [{ count: 6, block: [73, 45, 14] }, { count: 14, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 664, ECCode: 810, Size: 661,
                    RS: [{ count: 11, block: [54, 24, 15] }, { count: 16, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 514, ECCode: 960, Size: 511,
                    RS: [{ count: 30, block: [46, 16, 15] }, { count: 2, block: [47, 17, 15] }],
                },
                Alignment: [{ x: 26, y: 4 }, { x: 52, y: 4 }, { x: 78, y: 4 }, { x: 4, y: 26 }, { x: 26, y: 26 }, { x: 52, y: 26 }, { x: 78, y: 26 }, { x: 104, y: 26 }, { x: 4, y: 52 }, { x: 26, y: 52 }, { x: 52, y: 52 }, { x: 78, y: 52 }, { x: 104, y: 52 }, { x: 4, y: 78 }, { x: 26, y: 78 }, { x: 52, y: 78 }, { x: 78, y: 78 }, { x: 104, y: 78 }, { x: 26, y: 104 }, { x: 52, y: 104 }, { x: 78, y: 104 }, { x: 104, y: 104 }],
            },
            25: {
                L: {
                    DataCode: 1276, ECCode: 312, Size: 1273,
                    RS: [{ count: 8, block: [132, 106, 13] }, { count: 4, block: [133, 107, 13] }],
                },
                M: {
                    DataCode: 1000, ECCode: 588, Size: 997,
                    RS: [{ count: 8, block: [75, 47, 14] }, { count: 13, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 718, ECCode: 870, Size: 715,
                    RS: [{ count: 7, block: [54, 24, 15] }, { count: 22, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 538, ECCode: 1050, Size: 535,
                    RS: [{ count: 22, block: [45, 15, 15] }, { count: 13, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 30, y: 4 }, { x: 56, y: 4 }, { x: 82, y: 4 }, { x: 4, y: 30 }, { x: 30, y: 30 }, { x: 56, y: 30 }, { x: 82, y: 30 }, { x: 108, y: 30 }, { x: 4, y: 56 }, { x: 30, y: 56 }, { x: 56, y: 56 }, { x: 82, y: 56 }, { x: 108, y: 56 }, { x: 4, y: 82 }, { x: 30, y: 82 }, { x: 56, y: 82 }, { x: 82, y: 82 }, { x: 108, y: 82 }, { x: 30, y: 108 }, { x: 56, y: 108 }, { x: 82, y: 108 }, { x: 108, y: 108 }],
            },
            26: {
                L: {
                    DataCode: 1370, ECCode: 336, Size: 1367,
                    RS: [{ count: 10, block: [142, 114, 14] }, { count: 2, block: [143, 115, 14] }],
                },
                M: {
                    DataCode: 1062, ECCode: 644, Size: 1059,
                    RS: [{ count: 19, block: [74, 46, 14] }, { count: 4, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 754, ECCode: 952, Size: 751,
                    RS: [{ count: 28, block: [50, 22, 14] }, { count: 6, block: [51, 23, 14] }],
                },
                H: {
                    DataCode: 596, ECCode: 1110, Size: 593,
                    RS: [{ count: 33, block: [46, 16, 15] }, { count: 4, block: [47, 17, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 56, y: 4 }, { x: 84, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 56, y: 28 }, { x: 84, y: 28 }, { x: 112, y: 28 }, { x: 4, y: 56 }, { x: 28, y: 56 }, { x: 56, y: 56 }, { x: 84, y: 56 }, { x: 112, y: 56 }, { x: 4, y: 84 }, { x: 28, y: 84 }, { x: 56, y: 84 }, { x: 84, y: 84 }, { x: 112, y: 84 }, { x: 28, y: 112 }, { x: 56, y: 112 }, { x: 84, y: 112 }, { x: 112, y: 112 }],
            },
            27: {
                L: {
                    DataCode: 1468, ECCode: 360, Size: 1465,
                    RS: [{ count: 8, block: [152, 122, 15] }, { count: 4, block: [153, 123, 15] }],
                },
                M: {
                    DataCode: 1128, ECCode: 700, Size: 1125,
                    RS: [{ count: 22, block: [73, 45, 14] }, { count: 3, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 808, ECCode: 1020, Size: 805,
                    RS: [{ count: 8, block: [53, 23, 15] }, { count: 26, block: [54, 24, 15] }],
                },
                H: {
                    DataCode: 628, ECCode: 1200, Size: 625,
                    RS: [{ count: 12, block: [45, 15, 15] }, { count: 28, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 32, y: 4 }, { x: 60, y: 4 }, { x: 88, y: 4 }, { x: 4, y: 32 }, { x: 32, y: 32 }, { x: 60, y: 32 }, { x: 88, y: 32 }, { x: 116, y: 32 }, { x: 4, y: 60 }, { x: 32, y: 60 }, { x: 60, y: 60 }, { x: 88, y: 60 }, { x: 116, y: 60 }, { x: 4, y: 88 }, { x: 32, y: 88 }, { x: 60, y: 88 }, { x: 88, y: 88 }, { x: 116, y: 88 }, { x: 32, y: 116 }, { x: 60, y: 116 }, { x: 88, y: 116 }, { x: 116, y: 116 }],
            },
            28: {
                L: {
                    DataCode: 1531, ECCode: 390, Size: 1528,
                    RS: [{ count: 3, block: [147, 117, 15] }, { count: 10, block: [148, 118, 15] }],
                },
                M: {
                    DataCode: 1193, ECCode: 728, Size: 1190,
                    RS: [{ count: 3, block: [73, 45, 14] }, { count: 23, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 871, ECCode: 1050, Size: 868,
                    RS: [{ count: 4, block: [54, 24, 15] }, { count: 31, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 661, ECCode: 1260, Size: 658,
                    RS: [{ count: 11, block: [45, 15, 15] }, { count: 31, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 48, y: 4 }, { x: 72, y: 4 }, { x: 96, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 48, y: 24 }, { x: 72, y: 24 }, { x: 96, y: 24 }, { x: 120, y: 24 }, { x: 4, y: 48 }, { x: 24, y: 48 }, { x: 48, y: 48 }, { x: 72, y: 48 }, { x: 96, y: 48 }, { x: 120, y: 48 }, { x: 4, y: 72 }, { x: 24, y: 72 }, { x: 48, y: 72 }, { x: 72, y: 72 }, { x: 96, y: 72 }, { x: 120, y: 72 }, { x: 4, y: 96 }, { x: 24, y: 96 }, { x: 48, y: 96 }, { x: 72, y: 96 }, { x: 96, y: 96 }, { x: 120, y: 96 }, { x: 24, y: 120 }, { x: 48, y: 120 }, { x: 72, y: 120 }, { x: 96, y: 120 }, { x: 120, y: 120 }],
            },
            29: {
                L: {
                    DataCode: 1631, ECCode: 420, Size: 1628,
                    RS: [{ count: 7, block: [146, 116, 15] }, { count: 7, block: [147, 117, 15] }],
                },
                M: {
                    DataCode: 1267, ECCode: 784, Size: 1264,
                    RS: [{ count: 21, block: [73, 45, 14] }, { count: 7, block: [74, 46, 14] }],
                },
                Q: {
                    DataCode: 911, ECCode: 1140, Size: 908,
                    RS: [{ count: 1, block: [53, 23, 15] }, { count: 37, block: [54, 24, 15] }],
                },
                H: {
                    DataCode: 701, ECCode: 1350, Size: 698,
                    RS: [{ count: 19, block: [45, 15, 15] }, { count: 26, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 52, y: 4 }, { x: 76, y: 4 }, { x: 100, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 52, y: 28 }, { x: 76, y: 28 }, { x: 100, y: 28 }, { x: 124, y: 28 }, { x: 4, y: 52 }, { x: 28, y: 52 }, { x: 52, y: 52 }, { x: 76, y: 52 }, { x: 100, y: 52 }, { x: 124, y: 52 }, { x: 4, y: 76 }, { x: 28, y: 76 }, { x: 52, y: 76 }, { x: 76, y: 76 }, { x: 100, y: 76 }, { x: 124, y: 76 }, { x: 4, y: 100 }, { x: 28, y: 100 }, { x: 52, y: 100 }, { x: 76, y: 100 }, { x: 100, y: 100 }, { x: 124, y: 100 }, { x: 28, y: 124 }, { x: 52, y: 124 }, { x: 76, y: 124 }, { x: 100, y: 124 }, { x: 124, y: 124 }],
            },
            30: {
                L: {
                    DataCode: 1735, ECCode: 450, Size: 1732,
                    RS: [{ count: 5, block: [145, 115, 15] }, { count: 10, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 1373, ECCode: 812, Size: 1370,
                    RS: [{ count: 19, block: [75, 47, 14] }, { count: 10, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 985, ECCode: 1200, Size: 982,
                    RS: [{ count: 15, block: [54, 24, 15] }, { count: 25, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 745, ECCode: 1440, Size: 742,
                    RS: [{ count: 23, block: [45, 15, 15] }, { count: 25, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 50, y: 4 }, { x: 76, y: 4 }, { x: 102, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 50, y: 24 }, { x: 76, y: 24 }, { x: 102, y: 24 }, { x: 128, y: 24 }, { x: 4, y: 50 }, { x: 24, y: 50 }, { x: 50, y: 50 }, { x: 76, y: 50 }, { x: 102, y: 50 }, { x: 128, y: 50 }, { x: 4, y: 76 }, { x: 24, y: 76 }, { x: 50, y: 76 }, { x: 76, y: 76 }, { x: 102, y: 76 }, { x: 128, y: 76 }, { x: 4, y: 102 }, { x: 24, y: 102 }, { x: 50, y: 102 }, { x: 76, y: 102 }, { x: 102, y: 102 }, { x: 128, y: 102 }, { x: 24, y: 128 }, { x: 50, y: 128 }, { x: 76, y: 128 }, { x: 102, y: 128 }, { x: 128, y: 128 }],
            },
            31: {
                L: {
                    DataCode: 1843, ECCode: 480, Size: 1840,
                    RS: [{ count: 13, block: [145, 115, 15] }, { count: 3, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 1455, ECCode: 868, Size: 1452,
                    RS: [{ count: 2, block: [74, 46, 14] }, { count: 29, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1033, ECCode: 1290, Size: 1030,
                    RS: [{ count: 42, block: [54, 24, 15] }, { count: 1, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 793, ECCode: 1530, Size: 790,
                    RS: [{ count: 23, block: [45, 15, 15] }, { count: 28, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 54, y: 4 }, { x: 80, y: 4 }, { x: 106, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 54, y: 28 }, { x: 80, y: 28 }, { x: 106, y: 28 }, { x: 132, y: 28 }, { x: 4, y: 54 }, { x: 28, y: 54 }, { x: 54, y: 54 }, { x: 80, y: 54 }, { x: 106, y: 54 }, { x: 132, y: 54 }, { x: 4, y: 80 }, { x: 28, y: 80 }, { x: 54, y: 80 }, { x: 80, y: 80 }, { x: 106, y: 80 }, { x: 132, y: 80 }, { x: 4, y: 106 }, { x: 28, y: 106 }, { x: 54, y: 106 }, { x: 80, y: 106 }, { x: 106, y: 106 }, { x: 132, y: 106 }, { x: 28, y: 132 }, { x: 54, y: 132 }, { x: 80, y: 132 }, { x: 106, y: 132 }, { x: 132, y: 132 }],
            },
            32: {
                L: {
                    DataCode: 1955, ECCode: 510, Size: 1952,
                    RS: [{ count: 17, block: [145, 115, 15] }],
                },
                M: {
                    DataCode: 1541, ECCode: 924, Size: 1538,
                    RS: [{ count: 10, block: [74, 46, 14] }, { count: 23, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1115, ECCode: 1350, Size: 1112,
                    RS: [{ count: 10, block: [54, 24, 15] }, { count: 35, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 845, ECCode: 1620, Size: 842,
                    RS: [{ count: 19, block: [45, 15, 15] }, { count: 35, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 32, y: 4 }, { x: 58, y: 4 }, { x: 84, y: 4 }, { x: 110, y: 4 }, { x: 4, y: 32 }, { x: 32, y: 32 }, { x: 58, y: 32 }, { x: 84, y: 32 }, { x: 110, y: 32 }, { x: 136, y: 32 }, { x: 4, y: 58 }, { x: 32, y: 58 }, { x: 58, y: 58 }, { x: 84, y: 58 }, { x: 110, y: 58 }, { x: 136, y: 58 }, { x: 4, y: 84 }, { x: 32, y: 84 }, { x: 58, y: 84 }, { x: 84, y: 84 }, { x: 110, y: 84 }, { x: 136, y: 84 }, { x: 4, y: 110 }, { x: 32, y: 110 }, { x: 58, y: 110 }, { x: 84, y: 110 }, { x: 110, y: 110 }, { x: 136, y: 110 }, { x: 32, y: 136 }, { x: 58, y: 136 }, { x: 84, y: 136 }, { x: 110, y: 136 }, { x: 136, y: 136 }],
            },
            33: {
                L: {
                    DataCode: 2071, ECCode: 540, Size: 2068,
                    RS: [{ count: 17, block: [145, 115, 15] }, { count: 1, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 1631, ECCode: 980, Size: 1628,
                    RS: [{ count: 14, block: [74, 46, 14] }, { count: 21, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1171, ECCode: 1440, Size: 1168,
                    RS: [{ count: 29, block: [54, 24, 15] }, { count: 19, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 901, ECCode: 1710, Size: 898,
                    RS: [{ count: 11, block: [45, 15, 15] }, { count: 46, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 56, y: 4 }, { x: 84, y: 4 }, { x: 112, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 56, y: 28 }, { x: 84, y: 28 }, { x: 112, y: 28 }, { x: 140, y: 28 }, { x: 4, y: 56 }, { x: 28, y: 56 }, { x: 56, y: 56 }, { x: 84, y: 56 }, { x: 112, y: 56 }, { x: 140, y: 56 }, { x: 4, y: 84 }, { x: 28, y: 84 }, { x: 56, y: 84 }, { x: 84, y: 84 }, { x: 112, y: 84 }, { x: 140, y: 84 }, { x: 4, y: 112 }, { x: 28, y: 112 }, { x: 56, y: 112 }, { x: 84, y: 112 }, { x: 112, y: 112 }, { x: 140, y: 112 }, { x: 28, y: 140 }, { x: 56, y: 140 }, { x: 84, y: 140 }, { x: 112, y: 140 }, { x: 140, y: 140 }],
            },
            34: {
                L: {
                    DataCode: 2191, ECCode: 570, Size: 2188,
                    RS: [{ count: 13, block: [145, 115, 15] }, { count: 6, block: [146, 116, 15] }],
                },
                M: {
                    DataCode: 1725, ECCode: 1036, Size: 1722,
                    RS: [{ count: 14, block: [74, 46, 14] }, { count: 23, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1231, ECCode: 1530, Size: 1228,
                    RS: [{ count: 44, block: [54, 24, 15] }, { count: 7, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 961, ECCode: 1800, Size: 958,
                    RS: [{ count: 59, block: [46, 16, 15] }, { count: 1, block: [47, 17, 15] }],
                },
                Alignment: [{ x: 32, y: 4 }, { x: 60, y: 4 }, { x: 88, y: 4 }, { x: 116, y: 4 }, { x: 4, y: 32 }, { x: 32, y: 32 }, { x: 60, y: 32 }, { x: 88, y: 32 }, { x: 116, y: 32 }, { x: 144, y: 32 }, { x: 4, y: 60 }, { x: 32, y: 60 }, { x: 60, y: 60 }, { x: 88, y: 60 }, { x: 116, y: 60 }, { x: 144, y: 60 }, { x: 4, y: 88 }, { x: 32, y: 88 }, { x: 60, y: 88 }, { x: 88, y: 88 }, { x: 116, y: 88 }, { x: 144, y: 88 }, { x: 4, y: 116 }, { x: 32, y: 116 }, { x: 60, y: 116 }, { x: 88, y: 116 }, { x: 116, y: 116 }, { x: 144, y: 116 }, { x: 32, y: 144 }, { x: 60, y: 144 }, { x: 88, y: 144 }, { x: 116, y: 144 }, { x: 144, y: 144 }],
            },
            35: {
                L: {
                    DataCode: 2306, ECCode: 570, Size: 2303,
                    RS: [{ count: 12, block: [151, 121, 15] }, { count: 7, block: [152, 122, 15] }],
                },
                M: {
                    DataCode: 1812, ECCode: 1064, Size: 1809,
                    RS: [{ count: 12, block: [75, 47, 14] }, { count: 26, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 1286, ECCode: 1590, Size: 1283,
                    RS: [{ count: 39, block: [54, 24, 15] }, { count: 14, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 986, ECCode: 1890, Size: 983,
                    RS: [{ count: 22, block: [45, 15, 15] }, { count: 41, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 52, y: 4 }, { x: 76, y: 4 }, { x: 100, y: 4 }, { x: 124, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 52, y: 28 }, { x: 76, y: 28 }, { x: 100, y: 28 }, { x: 124, y: 28 }, { x: 148, y: 28 }, { x: 4, y: 52 }, { x: 28, y: 52 }, { x: 52, y: 52 }, { x: 76, y: 52 }, { x: 100, y: 52 }, { x: 124, y: 52 }, { x: 148, y: 52 }, { x: 4, y: 76 }, { x: 28, y: 76 }, { x: 52, y: 76 }, { x: 76, y: 76 }, { x: 100, y: 76 }, { x: 124, y: 76 }, { x: 148, y: 76 }, { x: 4, y: 100 }, { x: 28, y: 100 }, { x: 52, y: 100 }, { x: 76, y: 100 }, { x: 100, y: 100 }, { x: 124, y: 100 }, { x: 148, y: 100 }, { x: 4, y: 124 }, { x: 28, y: 124 }, { x: 52, y: 124 }, { x: 76, y: 124 }, { x: 100, y: 124 }, { x: 124, y: 124 }, { x: 148, y: 124 }, { x: 28, y: 148 }, { x: 52, y: 148 }, { x: 76, y: 148 }, { x: 100, y: 148 }, { x: 124, y: 148 }, { x: 148, y: 148 }],
            },
            36: {
                L: {
                    DataCode: 2434, ECCode: 600, Size: 2431,
                    RS: [{ count: 6, block: [151, 121, 15] }, { count: 14, block: [152, 122, 15] }],
                },
                M: {
                    DataCode: 1914, ECCode: 1120, Size: 1911,
                    RS: [{ count: 6, block: [75, 47, 14] }, { count: 34, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 1354, ECCode: 1680, Size: 1351,
                    RS: [{ count: 46, block: [54, 24, 15] }, { count: 10, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 1054, ECCode: 1980, Size: 1051,
                    RS: [{ count: 2, block: [45, 15, 15] }, { count: 64, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 22, y: 4 }, { x: 48, y: 4 }, { x: 74, y: 4 }, { x: 100, y: 4 }, { x: 126, y: 4 }, { x: 4, y: 22 }, { x: 22, y: 22 }, { x: 48, y: 22 }, { x: 74, y: 22 }, { x: 100, y: 22 }, { x: 126, y: 22 }, { x: 152, y: 22 }, { x: 4, y: 48 }, { x: 22, y: 48 }, { x: 48, y: 48 }, { x: 74, y: 48 }, { x: 100, y: 48 }, { x: 126, y: 48 }, { x: 152, y: 48 }, { x: 4, y: 74 }, { x: 22, y: 74 }, { x: 48, y: 74 }, { x: 74, y: 74 }, { x: 100, y: 74 }, { x: 126, y: 74 }, { x: 152, y: 74 }, { x: 4, y: 100 }, { x: 22, y: 100 }, { x: 48, y: 100 }, { x: 74, y: 100 }, { x: 100, y: 100 }, { x: 126, y: 100 }, { x: 152, y: 100 }, { x: 4, y: 126 }, { x: 22, y: 126 }, { x: 48, y: 126 }, { x: 74, y: 126 }, { x: 100, y: 126 }, { x: 126, y: 126 }, { x: 152, y: 126 }, { x: 22, y: 152 }, { x: 48, y: 152 }, { x: 74, y: 152 }, { x: 100, y: 152 }, { x: 126, y: 152 }, { x: 152, y: 152 }],
            },
            37: {
                L: {
                    DataCode: 2566, ECCode: 630, Size: 2563,
                    RS: [{ count: 17, block: [152, 122, 15] }, { count: 4, block: [153, 123, 15] }],
                },
                M: {
                    DataCode: 1992, ECCode: 1204, Size: 1989,
                    RS: [{ count: 29, block: [74, 46, 14] }, { count: 14, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1426, ECCode: 1770, Size: 1423,
                    RS: [{ count: 49, block: [54, 24, 15] }, { count: 10, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 1096, ECCode: 2100, Size: 1093,
                    RS: [{ count: 24, block: [45, 15, 15] }, { count: 46, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 26, y: 4 }, { x: 52, y: 4 }, { x: 78, y: 4 }, { x: 104, y: 4 }, { x: 130, y: 4 }, { x: 4, y: 26 }, { x: 26, y: 26 }, { x: 52, y: 26 }, { x: 78, y: 26 }, { x: 104, y: 26 }, { x: 130, y: 26 }, { x: 156, y: 26 }, { x: 4, y: 52 }, { x: 26, y: 52 }, { x: 52, y: 52 }, { x: 78, y: 52 }, { x: 104, y: 52 }, { x: 130, y: 52 }, { x: 156, y: 52 }, { x: 4, y: 78 }, { x: 26, y: 78 }, { x: 52, y: 78 }, { x: 78, y: 78 }, { x: 104, y: 78 }, { x: 130, y: 78 }, { x: 156, y: 78 }, { x: 4, y: 104 }, { x: 26, y: 104 }, { x: 52, y: 104 }, { x: 78, y: 104 }, { x: 104, y: 104 }, { x: 130, y: 104 }, { x: 156, y: 104 }, { x: 4, y: 130 }, { x: 26, y: 130 }, { x: 52, y: 130 }, { x: 78, y: 130 }, { x: 104, y: 130 }, { x: 130, y: 130 }, { x: 156, y: 130 }, { x: 26, y: 156 }, { x: 52, y: 156 }, { x: 78, y: 156 }, { x: 104, y: 156 }, { x: 130, y: 156 }, { x: 156, y: 156 }],
            },
            38: {
                L: {
                    DataCode: 2702, ECCode: 660, Size: 2699,
                    RS: [{ count: 4, block: [152, 122, 15] }, { count: 18, block: [153, 123, 15] }],
                },
                M: {
                    DataCode: 2102, ECCode: 1260, Size: 2099,
                    RS: [{ count: 13, block: [74, 46, 14] }, { count: 32, block: [75, 47, 14] }],
                },
                Q: {
                    DataCode: 1502, ECCode: 1860, Size: 1499,
                    RS: [{ count: 48, block: [54, 24, 15] }, { count: 14, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 1142, ECCode: 2220, Size: 1139,
                    RS: [{ count: 42, block: [45, 15, 15] }, { count: 32, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 30, y: 4 }, { x: 56, y: 4 }, { x: 82, y: 4 }, { x: 108, y: 4 }, { x: 134, y: 4 }, { x: 4, y: 30 }, { x: 30, y: 30 }, { x: 56, y: 30 }, { x: 82, y: 30 }, { x: 108, y: 30 }, { x: 134, y: 30 }, { x: 160, y: 30 }, { x: 4, y: 56 }, { x: 30, y: 56 }, { x: 56, y: 56 }, { x: 82, y: 56 }, { x: 108, y: 56 }, { x: 134, y: 56 }, { x: 160, y: 56 }, { x: 4, y: 82 }, { x: 30, y: 82 }, { x: 56, y: 82 }, { x: 82, y: 82 }, { x: 108, y: 82 }, { x: 134, y: 82 }, { x: 160, y: 82 }, { x: 4, y: 108 }, { x: 30, y: 108 }, { x: 56, y: 108 }, { x: 82, y: 108 }, { x: 108, y: 108 }, { x: 134, y: 108 }, { x: 160, y: 108 }, { x: 4, y: 134 }, { x: 30, y: 134 }, { x: 56, y: 134 }, { x: 82, y: 134 }, { x: 108, y: 134 }, { x: 134, y: 134 }, { x: 160, y: 134 }, { x: 30, y: 160 }, { x: 56, y: 160 }, { x: 82, y: 160 }, { x: 108, y: 160 }, { x: 134, y: 160 }, { x: 160, y: 160 }],
            },
            39: {
                L: {
                    DataCode: 2812, ECCode: 720, Size: 2809,
                    RS: [{ count: 20, block: [147, 117, 15] }, { count: 4, block: [148, 118, 15] }],
                },
                M: {
                    DataCode: 2216, ECCode: 1316, Size: 2213,
                    RS: [{ count: 40, block: [75, 47, 14] }, { count: 7, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 1582, ECCode: 1950, Size: 1579,
                    RS: [{ count: 43, block: [54, 24, 15] }, { count: 22, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 1222, ECCode: 2310, Size: 1219,
                    RS: [{ count: 10, block: [45, 15, 15] }, { count: 67, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 24, y: 4 }, { x: 52, y: 4 }, { x: 80, y: 4 }, { x: 108, y: 4 }, { x: 136, y: 4 }, { x: 4, y: 24 }, { x: 24, y: 24 }, { x: 52, y: 24 }, { x: 80, y: 24 }, { x: 108, y: 24 }, { x: 136, y: 24 }, { x: 164, y: 24 }, { x: 4, y: 52 }, { x: 24, y: 52 }, { x: 52, y: 52 }, { x: 80, y: 52 }, { x: 108, y: 52 }, { x: 136, y: 52 }, { x: 164, y: 52 }, { x: 4, y: 80 }, { x: 24, y: 80 }, { x: 52, y: 80 }, { x: 80, y: 80 }, { x: 108, y: 80 }, { x: 136, y: 80 }, { x: 164, y: 80 }, { x: 4, y: 108 }, { x: 24, y: 108 }, { x: 52, y: 108 }, { x: 80, y: 108 }, { x: 108, y: 108 }, { x: 136, y: 108 }, { x: 164, y: 108 }, { x: 4, y: 136 }, { x: 24, y: 136 }, { x: 52, y: 136 }, { x: 80, y: 136 }, { x: 108, y: 136 }, { x: 136, y: 136 }, { x: 164, y: 136 }, { x: 24, y: 164 }, { x: 52, y: 164 }, { x: 80, y: 164 }, { x: 108, y: 164 }, { x: 136, y: 164 }, { x: 164, y: 164 }],
            },
            40: {
                L: {
                    DataCode: 2956, ECCode: 750, Size: 2953,
                    RS: [{ count: 19, block: [148, 118, 15] }, { count: 6, block: [149, 119, 15] }],
                },
                M: {
                    DataCode: 2334, ECCode: 1372, Size: 2331,
                    RS: [{ count: 18, block: [75, 47, 14] }, { count: 31, block: [76, 48, 14] }],
                },
                Q: {
                    DataCode: 1666, ECCode: 2040, Size: 1663,
                    RS: [{ count: 34, block: [54, 24, 15] }, { count: 34, block: [55, 25, 15] }],
                },
                H: {
                    DataCode: 1276, ECCode: 2430, Size: 1273,
                    RS: [{ count: 20, block: [45, 15, 15] }, { count: 61, block: [46, 16, 15] }],
                },
                Alignment: [{ x: 28, y: 4 }, { x: 56, y: 4 }, { x: 84, y: 4 }, { x: 112, y: 4 }, { x: 140, y: 4 }, { x: 4, y: 28 }, { x: 28, y: 28 }, { x: 56, y: 28 }, { x: 84, y: 28 }, { x: 112, y: 28 }, { x: 140, y: 28 }, { x: 168, y: 28 }, { x: 4, y: 56 }, { x: 28, y: 56 }, { x: 56, y: 56 }, { x: 84, y: 56 }, { x: 112, y: 56 }, { x: 140, y: 56 }, { x: 168, y: 56 }, { x: 4, y: 84 }, { x: 28, y: 84 }, { x: 56, y: 84 }, { x: 84, y: 84 }, { x: 112, y: 84 }, { x: 140, y: 84 }, { x: 168, y: 84 }, { x: 4, y: 112 }, { x: 28, y: 112 }, { x: 56, y: 112 }, { x: 84, y: 112 }, { x: 112, y: 112 }, { x: 140, y: 112 }, { x: 168, y: 112 }, { x: 4, y: 140 }, { x: 28, y: 140 }, { x: 56, y: 140 }, { x: 84, y: 140 }, { x: 112, y: 140 }, { x: 140, y: 140 }, { x: 168, y: 140 }, { x: 28, y: 168 }, { x: 56, y: 168 }, { x: 84, y: 168 }, { x: 112, y: 168 }, { x: 140, y: 168 }, { x: 168, y: 168 }],
            },
        },
        ItoE: [
            -1, 0, 1, 25, 2, 50, 26, 198,
            3, 223, 51, 238, 27, 104, 199, 75,
            4, 100, 224, 14, 52, 141, 239, 129,
            28, 193, 105, 248, 200, 8, 76, 113,
            5, 138, 101, 47, 225, 36, 15, 33,
            53, 147, 142, 218, 240, 18, 130, 69,
            29, 181, 194, 125, 106, 39, 249, 185,
            201, 154, 9, 120, 77, 228, 114, 166,
            6, 191, 139, 98, 102, 221, 48, 253,
            226, 152, 37, 179, 16, 145, 34, 136,
            54, 208, 148, 206, 143, 150, 219, 189,
            241, 210, 19, 92, 131, 56, 70, 64,
            30, 66, 182, 163, 195, 72, 126, 110,
            107, 58, 40, 84, 250, 133, 186, 61,
            202, 94, 155, 159, 10, 21, 121, 43,
            78, 212, 229, 172, 115, 243, 167, 87,
            7, 112, 192, 247, 140, 128, 99, 13,
            103, 74, 222, 237, 49, 197, 254, 24,
            227, 165, 153, 119, 38, 184, 180, 124,
            17, 68, 146, 217, 35, 32, 137, 46,
            55, 63, 209, 91, 149, 188, 207, 205,
            144, 135, 151, 178, 220, 252, 190, 97,
            242, 86, 211, 171, 20, 42, 93, 158,
            132, 60, 57, 83, 71, 109, 65, 162,
            31, 45, 67, 216, 183, 123, 164, 118,
            196, 23, 73, 236, 127, 12, 111, 246,
            108, 161, 59, 82, 41, 157, 85, 170,
            251, 96, 134, 177, 187, 204, 62, 90,
            203, 89, 95, 176, 156, 169, 160, 81,
            11, 245, 22, 235, 122, 117, 44, 215,
            79, 174, 213, 233, 230, 231, 173, 232,
            116, 214, 244, 234, 168, 80, 88, 175,
        ],
        G: {
            7: [{ a: 0, x: 7 }, { a: 87, x: 6 }, { a: 229, x: 5 }, { a: 146, x: 4 }, { a: 149, x: 3 }, { a: 238, x: 2 }, { a: 102, x: 1 }, { a: 21, x: 0 }],
            10: [{ a: 0, x: 10 }, { a: 251, x: 9 }, { a: 67, x: 8 }, { a: 46, x: 7 }, { a: 61, x: 6 }, { a: 118, x: 5 }, { a: 70, x: 4 }, { a: 64, x: 3 }, { a: 94, x: 2 }, { a: 32, x: 1 }, { a: 45, x: 0 }],
            13: [{ a: 0, x: 13 }, { a: 74, x: 12 }, { a: 152, x: 11 }, { a: 176, x: 10 }, { a: 100, x: 9 }, { a: 86, x: 8 }, { a: 100, x: 7 }, { a: 106, x: 6 }, { a: 104, x: 5 }, { a: 130, x: 4 }, { a: 218, x: 3 }, { a: 206, x: 2 }, { a: 140, x: 1 }, { a: 78, x: 0 }],
            15: [{ a: 0, x: 15 }, { a: 8, x: 14 }, { a: 183, x: 13 }, { a: 61, x: 12 }, { a: 91, x: 11 }, { a: 202, x: 10 }, { a: 37, x: 9 }, { a: 51, x: 8 }, { a: 58, x: 7 }, { a: 58, x: 6 }, { a: 237, x: 5 }, { a: 140, x: 4 }, { a: 124, x: 3 }, { a: 5, x: 2 }, { a: 99, x: 1 }, { a: 105, x: 0 }],
            16: [{ a: 0, x: 16 }, { a: 120, x: 15 }, { a: 104, x: 14 }, { a: 107, x: 13 }, { a: 109, x: 12 }, { a: 102, x: 11 }, { a: 161, x: 10 }, { a: 76, x: 9 }, { a: 3, x: 8 }, { a: 91, x: 7 }, { a: 191, x: 6 }, { a: 147, x: 5 }, { a: 169, x: 4 }, { a: 182, x: 3 }, { a: 194, x: 2 }, { a: 225, x: 1 }, { a: 120, x: 0 }],
            17: [{ a: 0, x: 17 }, { a: 43, x: 16 }, { a: 139, x: 15 }, { a: 206, x: 14 }, { a: 78, x: 13 }, { a: 43, x: 12 }, { a: 239, x: 11 }, { a: 123, x: 10 }, { a: 206, x: 9 }, { a: 214, x: 8 }, { a: 147, x: 7 }, { a: 24, x: 6 }, { a: 99, x: 5 }, { a: 150, x: 4 }, { a: 39, x: 3 }, { a: 243, x: 2 }, { a: 163, x: 1 }, { a: 136, x: 0 }],
            18: [{ a: 0, x: 18 }, { a: 215, x: 17 }, { a: 234, x: 16 }, { a: 158, x: 15 }, { a: 94, x: 14 }, { a: 184, x: 13 }, { a: 97, x: 12 }, { a: 118, x: 11 }, { a: 170, x: 10 }, { a: 79, x: 9 }, { a: 187, x: 8 }, { a: 152, x: 7 }, { a: 148, x: 6 }, { a: 252, x: 5 }, { a: 179, x: 4 }, { a: 5, x: 3 }, { a: 98, x: 2 }, { a: 96, x: 1 }, { a: 153, x: 0 }],
            20: [{ a: 0, x: 20 }, { a: 17, x: 19 }, { a: 60, x: 18 }, { a: 79, x: 17 }, { a: 50, x: 16 }, { a: 61, x: 15 }, { a: 163, x: 14 }, { a: 26, x: 13 }, { a: 187, x: 12 }, { a: 202, x: 11 }, { a: 180, x: 10 }, { a: 221, x: 9 }, { a: 225, x: 8 }, { a: 83, x: 7 }, { a: 239, x: 6 }, { a: 156, x: 5 }, { a: 164, x: 4 }, { a: 212, x: 3 }, { a: 212, x: 2 }, { a: 188, x: 1 }, { a: 190, x: 0 }],
            22: [{ a: 0, x: 22 }, { a: 210, x: 21 }, { a: 171, x: 20 }, { a: 247, x: 19 }, { a: 242, x: 18 }, { a: 93, x: 17 }, { a: 230, x: 16 }, { a: 14, x: 15 }, { a: 109, x: 14 }, { a: 221, x: 13 }, { a: 53, x: 12 }, { a: 200, x: 11 }, { a: 74, x: 10 }, { a: 8, x: 9 }, { a: 172, x: 8 }, { a: 98, x: 7 }, { a: 80, x: 6 }, { a: 219, x: 5 }, { a: 134, x: 4 }, { a: 160, x: 3 }, { a: 105, x: 2 }, { a: 165, x: 1 }, { a: 231, x: 0 }],
            24: [{ a: 0, x: 24 }, { a: 229, x: 23 }, { a: 121, x: 22 }, { a: 135, x: 21 }, { a: 48, x: 20 }, { a: 211, x: 19 }, { a: 117, x: 18 }, { a: 251, x: 17 }, { a: 126, x: 16 }, { a: 159, x: 15 }, { a: 180, x: 14 }, { a: 169, x: 13 }, { a: 152, x: 12 }, { a: 192, x: 11 }, { a: 226, x: 10 }, { a: 228, x: 9 }, { a: 218, x: 8 }, { a: 111, x: 7 }, { a: 0, x: 6 }, { a: 117, x: 5 }, { a: 232, x: 4 }, { a: 87, x: 3 }, { a: 96, x: 2 }, { a: 227, x: 1 }, { a: 21, x: 0 }],
            26: [{ a: 0, x: 26 }, { a: 173, x: 25 }, { a: 125, x: 24 }, { a: 158, x: 23 }, { a: 2, x: 22 }, { a: 103, x: 21 }, { a: 182, x: 20 }, { a: 118, x: 19 }, { a: 17, x: 18 }, { a: 145, x: 17 }, { a: 201, x: 16 }, { a: 111, x: 15 }, { a: 28, x: 14 }, { a: 165, x: 13 }, { a: 53, x: 12 }, { a: 161, x: 11 }, { a: 21, x: 10 }, { a: 245, x: 9 }, { a: 142, x: 8 }, { a: 13, x: 7 }, { a: 102, x: 6 }, { a: 48, x: 5 }, { a: 227, x: 4 }, { a: 153, x: 3 }, { a: 145, x: 2 }, { a: 218, x: 1 }, { a: 70, x: 0 }],
            28: [{ a: 0, x: 28 }, { a: 168, x: 27 }, { a: 223, x: 26 }, { a: 200, x: 25 }, { a: 104, x: 24 }, { a: 224, x: 23 }, { a: 234, x: 22 }, { a: 108, x: 21 }, { a: 180, x: 20 }, { a: 110, x: 19 }, { a: 190, x: 18 }, { a: 195, x: 17 }, { a: 147, x: 16 }, { a: 205, x: 15 }, { a: 27, x: 14 }, { a: 232, x: 13 }, { a: 201, x: 12 }, { a: 21, x: 11 }, { a: 43, x: 10 }, { a: 245, x: 9 }, { a: 87, x: 8 }, { a: 42, x: 7 }, { a: 195, x: 6 }, { a: 212, x: 5 }, { a: 119, x: 4 }, { a: 242, x: 3 }, { a: 37, x: 2 }, { a: 9, x: 1 }, { a: 123, x: 0 }],
            30: [{ a: 0, x: 30 }, { a: 41, x: 29 }, { a: 173, x: 28 }, { a: 145, x: 27 }, { a: 152, x: 26 }, { a: 216, x: 25 }, { a: 31, x: 24 }, { a: 179, x: 23 }, { a: 182, x: 22 }, { a: 50, x: 21 }, { a: 48, x: 20 }, { a: 110, x: 19 }, { a: 86, x: 18 }, { a: 239, x: 17 }, { a: 96, x: 16 }, { a: 222, x: 15 }, { a: 125, x: 14 }, { a: 42, x: 13 }, { a: 173, x: 12 }, { a: 226, x: 11 }, { a: 193, x: 10 }, { a: 224, x: 9 }, { a: 130, x: 8 }, { a: 156, x: 7 }, { a: 37, x: 6 }, { a: 251, x: 5 }, { a: 216, x: 4 }, { a: 238, x: 3 }, { a: 40, x: 2 }, { a: 192, x: 1 }, { a: 180, x: 0 }],
            32: [{ a: 0, x: 32 }, { a: 10, x: 31 }, { a: 6, x: 30 }, { a: 106, x: 29 }, { a: 190, x: 28 }, { a: 249, x: 27 }, { a: 167, x: 26 }, { a: 4, x: 25 }, { a: 67, x: 24 }, { a: 209, x: 23 }, { a: 138, x: 22 }, { a: 138, x: 21 }, { a: 32, x: 20 }, { a: 242, x: 19 }, { a: 123, x: 18 }, { a: 89, x: 17 }, { a: 27, x: 16 }, { a: 120, x: 15 }, { a: 185, x: 14 }, { a: 80, x: 13 }, { a: 156, x: 12 }, { a: 38, x: 11 }, { a: 69, x: 10 }, { a: 171, x: 9 }, { a: 60, x: 8 }, { a: 28, x: 7 }, { a: 222, x: 6 }, { a: 80, x: 5 }, { a: 52, x: 4 }, { a: 254, x: 3 }, { a: 185, x: 2 }, { a: 220, x: 1 }, { a: 241, x: 0 }],
            34: [{ a: 0, x: 34 }, { a: 111, x: 33 }, { a: 77, x: 32 }, { a: 146, x: 31 }, { a: 94, x: 30 }, { a: 26, x: 29 }, { a: 21, x: 28 }, { a: 108, x: 27 }, { a: 19, x: 26 }, { a: 105, x: 25 }, { a: 94, x: 24 }, { a: 113, x: 23 }, { a: 193, x: 22 }, { a: 86, x: 21 }, { a: 140, x: 20 }, { a: 163, x: 19 }, { a: 125, x: 18 }, { a: 58, x: 17 }, { a: 158, x: 16 }, { a: 229, x: 15 }, { a: 239, x: 14 }, { a: 218, x: 13 }, { a: 103, x: 12 }, { a: 56, x: 11 }, { a: 70, x: 10 }, { a: 114, x: 9 }, { a: 61, x: 8 }, { a: 183, x: 7 }, { a: 129, x: 6 }, { a: 167, x: 5 }, { a: 13, x: 4 }, { a: 98, x: 3 }, { a: 62, x: 2 }, { a: 129, x: 1 }, { a: 51, x: 0 }],
            36: [{ a: 0, x: 36 }, { a: 200, x: 35 }, { a: 183, x: 34 }, { a: 98, x: 33 }, { a: 16, x: 32 }, { a: 172, x: 31 }, { a: 31, x: 30 }, { a: 246, x: 29 }, { a: 234, x: 28 }, { a: 60, x: 27 }, { a: 152, x: 26 }, { a: 115, x: 25 }, { a: 0, x: 24 }, { a: 167, x: 23 }, { a: 152, x: 22 }, { a: 113, x: 21 }, { a: 248, x: 20 }, { a: 238, x: 19 }, { a: 107, x: 18 }, { a: 18, x: 17 }, { a: 63, x: 16 }, { a: 218, x: 15 }, { a: 37, x: 14 }, { a: 87, x: 13 }, { a: 210, x: 12 }, { a: 105, x: 11 }, { a: 177, x: 10 }, { a: 120, x: 9 }, { a: 74, x: 8 }, { a: 121, x: 7 }, { a: 196, x: 6 }, { a: 117, x: 5 }, { a: 251, x: 4 }, { a: 113, x: 3 }, { a: 233, x: 2 }, { a: 30, x: 1 }, { a: 120, x: 0 }],
            40: [{ a: 0, x: 40 }, { a: 59, x: 39 }, { a: 116, x: 38 }, { a: 79, x: 37 }, { a: 161, x: 36 }, { a: 252, x: 35 }, { a: 98, x: 34 }, { a: 128, x: 33 }, { a: 205, x: 32 }, { a: 128, x: 31 }, { a: 161, x: 30 }, { a: 247, x: 29 }, { a: 57, x: 28 }, { a: 163, x: 27 }, { a: 56, x: 26 }, { a: 235, x: 25 }, { a: 106, x: 24 }, { a: 53, x: 23 }, { a: 26, x: 22 }, { a: 187, x: 21 }, { a: 174, x: 20 }, { a: 226, x: 19 }, { a: 104, x: 18 }, { a: 170, x: 17 }, { a: 7, x: 16 }, { a: 175, x: 15 }, { a: 35, x: 14 }, { a: 181, x: 13 }, { a: 114, x: 12 }, { a: 88, x: 11 }, { a: 41, x: 10 }, { a: 47, x: 9 }, { a: 163, x: 8 }, { a: 125, x: 7 }, { a: 134, x: 6 }, { a: 72, x: 5 }, { a: 20, x: 4 }, { a: 232, x: 3 }, { a: 53, x: 2 }, { a: 35, x: 1 }, { a: 15, x: 0 }],
            42: [{ a: 0, x: 42 }, { a: 250, x: 41 }, { a: 103, x: 40 }, { a: 221, x: 39 }, { a: 230, x: 38 }, { a: 25, x: 37 }, { a: 18, x: 36 }, { a: 137, x: 35 }, { a: 231, x: 34 }, { a: 0, x: 33 }, { a: 3, x: 32 }, { a: 58, x: 31 }, { a: 242, x: 30 }, { a: 221, x: 29 }, { a: 191, x: 28 }, { a: 110, x: 27 }, { a: 84, x: 26 }, { a: 230, x: 25 }, { a: 8, x: 24 }, { a: 188, x: 23 }, { a: 106, x: 22 }, { a: 96, x: 21 }, { a: 147, x: 20 }, { a: 15, x: 19 }, { a: 131, x: 18 }, { a: 139, x: 17 }, { a: 34, x: 16 }, { a: 101, x: 15 }, { a: 223, x: 14 }, { a: 39, x: 13 }, { a: 101, x: 12 }, { a: 213, x: 11 }, { a: 199, x: 10 }, { a: 237, x: 9 }, { a: 254, x: 8 }, { a: 201, x: 7 }, { a: 123, x: 6 }, { a: 171, x: 5 }, { a: 162, x: 4 }, { a: 194, x: 3 }, { a: 117, x: 2 }, { a: 50, x: 1 }, { a: 96, x: 0 }],
            44: [{ a: 0, x: 44 }, { a: 190, x: 43 }, { a: 7, x: 42 }, { a: 61, x: 41 }, { a: 121, x: 40 }, { a: 71, x: 39 }, { a: 246, x: 38 }, { a: 69, x: 37 }, { a: 55, x: 36 }, { a: 168, x: 35 }, { a: 188, x: 34 }, { a: 89, x: 33 }, { a: 243, x: 32 }, { a: 191, x: 31 }, { a: 25, x: 30 }, { a: 72, x: 29 }, { a: 123, x: 28 }, { a: 9, x: 27 }, { a: 145, x: 26 }, { a: 14, x: 25 }, { a: 247, x: 24 }, { a: 1, x: 23 }, { a: 238, x: 22 }, { a: 44, x: 21 }, { a: 78, x: 20 }, { a: 143, x: 19 }, { a: 62, x: 18 }, { a: 224, x: 17 }, { a: 126, x: 16 }, { a: 118, x: 15 }, { a: 114, x: 14 }, { a: 68, x: 13 }, { a: 163, x: 12 }, { a: 52, x: 11 }, { a: 194, x: 10 }, { a: 217, x: 9 }, { a: 147, x: 8 }, { a: 204, x: 7 }, { a: 169, x: 6 }, { a: 37, x: 5 }, { a: 130, x: 4 }, { a: 113, x: 3 }, { a: 102, x: 2 }, { a: 73, x: 1 }, { a: 181, x: 0 }],
            46: [{ a: 0, x: 46 }, { a: 112, x: 45 }, { a: 94, x: 44 }, { a: 88, x: 43 }, { a: 112, x: 42 }, { a: 253, x: 41 }, { a: 224, x: 40 }, { a: 202, x: 39 }, { a: 115, x: 38 }, { a: 187, x: 37 }, { a: 99, x: 36 }, { a: 89, x: 35 }, { a: 5, x: 34 }, { a: 54, x: 33 }, { a: 113, x: 32 }, { a: 129, x: 31 }, { a: 44, x: 30 }, { a: 58, x: 29 }, { a: 16, x: 28 }, { a: 135, x: 27 }, { a: 216, x: 26 }, { a: 169, x: 25 }, { a: 211, x: 24 }, { a: 36, x: 23 }, { a: 1, x: 22 }, { a: 4, x: 21 }, { a: 96, x: 20 }, { a: 60, x: 19 }, { a: 241, x: 18 }, { a: 73, x: 17 }, { a: 104, x: 16 }, { a: 234, x: 15 }, { a: 8, x: 14 }, { a: 249, x: 13 }, { a: 245, x: 12 }, { a: 119, x: 11 }, { a: 174, x: 10 }, { a: 52, x: 9 }, { a: 25, x: 8 }, { a: 157, x: 7 }, { a: 224, x: 6 }, { a: 43, x: 5 }, { a: 202, x: 4 }, { a: 223, x: 3 }, { a: 19, x: 2 }, { a: 82, x: 1 }, { a: 15, x: 0 }],
            48: [{ a: 0, x: 48 }, { a: 228, x: 47 }, { a: 25, x: 46 }, { a: 196, x: 45 }, { a: 130, x: 44 }, { a: 211, x: 43 }, { a: 146, x: 42 }, { a: 60, x: 41 }, { a: 24, x: 40 }, { a: 251, x: 39 }, { a: 90, x: 38 }, { a: 39, x: 37 }, { a: 102, x: 36 }, { a: 240, x: 35 }, { a: 61, x: 34 }, { a: 178, x: 33 }, { a: 63, x: 32 }, { a: 46, x: 31 }, { a: 123, x: 30 }, { a: 115, x: 29 }, { a: 18, x: 28 }, { a: 221, x: 27 }, { a: 111, x: 26 }, { a: 135, x: 25 }, { a: 160, x: 24 }, { a: 182, x: 23 }, { a: 205, x: 22 }, { a: 107, x: 21 }, { a: 206, x: 20 }, { a: 95, x: 19 }, { a: 150, x: 18 }, { a: 120, x: 17 }, { a: 184, x: 16 }, { a: 91, x: 15 }, { a: 21, x: 14 }, { a: 247, x: 13 }, { a: 156, x: 12 }, { a: 140, x: 11 }, { a: 238, x: 10 }, { a: 191, x: 9 }, { a: 11, x: 8 }, { a: 94, x: 7 }, { a: 227, x: 6 }, { a: 84, x: 5 }, { a: 50, x: 4 }, { a: 163, x: 3 }, { a: 39, x: 2 }, { a: 34, x: 1 }, { a: 108, x: 0 }],
            50: [{ a: 0, x: 50 }, { a: 232, x: 49 }, { a: 125, x: 48 }, { a: 157, x: 47 }, { a: 161, x: 46 }, { a: 164, x: 45 }, { a: 9, x: 44 }, { a: 118, x: 43 }, { a: 46, x: 42 }, { a: 209, x: 41 }, { a: 99, x: 40 }, { a: 203, x: 39 }, { a: 193, x: 38 }, { a: 35, x: 37 }, { a: 3, x: 36 }, { a: 209, x: 35 }, { a: 111, x: 34 }, { a: 195, x: 33 }, { a: 242, x: 32 }, { a: 203, x: 31 }, { a: 225, x: 30 }, { a: 46, x: 29 }, { a: 13, x: 28 }, { a: 32, x: 27 }, { a: 160, x: 26 }, { a: 126, x: 25 }, { a: 209, x: 24 }, { a: 130, x: 23 }, { a: 160, x: 22 }, { a: 242, x: 21 }, { a: 215, x: 20 }, { a: 242, x: 19 }, { a: 75, x: 18 }, { a: 77, x: 17 }, { a: 42, x: 16 }, { a: 189, x: 15 }, { a: 32, x: 14 }, { a: 113, x: 13 }, { a: 65, x: 12 }, { a: 124, x: 11 }, { a: 69, x: 10 }, { a: 228, x: 9 }, { a: 114, x: 8 }, { a: 235, x: 7 }, { a: 175, x: 6 }, { a: 124, x: 5 }, { a: 170, x: 4 }, { a: 215, x: 3 }, { a: 232, x: 2 }, { a: 133, x: 1 }, { a: 205, x: 0 }],
            52: [{ a: 0, x: 52 }, { a: 116, x: 51 }, { a: 50, x: 50 }, { a: 86, x: 49 }, { a: 186, x: 48 }, { a: 50, x: 47 }, { a: 220, x: 46 }, { a: 251, x: 45 }, { a: 89, x: 44 }, { a: 192, x: 43 }, { a: 46, x: 42 }, { a: 86, x: 41 }, { a: 127, x: 40 }, { a: 124, x: 39 }, { a: 19, x: 38 }, { a: 184, x: 37 }, { a: 233, x: 36 }, { a: 151, x: 35 }, { a: 215, x: 34 }, { a: 22, x: 33 }, { a: 14, x: 32 }, { a: 59, x: 31 }, { a: 145, x: 30 }, { a: 37, x: 29 }, { a: 242, x: 28 }, { a: 203, x: 27 }, { a: 134, x: 26 }, { a: 254, x: 25 }, { a: 89, x: 24 }, { a: 190, x: 23 }, { a: 94, x: 22 }, { a: 59, x: 21 }, { a: 65, x: 20 }, { a: 124, x: 19 }, { a: 113, x: 18 }, { a: 100, x: 17 }, { a: 233, x: 16 }, { a: 235, x: 15 }, { a: 121, x: 14 }, { a: 22, x: 13 }, { a: 76, x: 12 }, { a: 86, x: 11 }, { a: 97, x: 10 }, { a: 39, x: 9 }, { a: 242, x: 8 }, { a: 200, x: 7 }, { a: 220, x: 6 }, { a: 101, x: 5 }, { a: 33, x: 4 }, { a: 239, x: 3 }, { a: 254, x: 2 }, { a: 116, x: 1 }, { a: 51, x: 0 }],
            54: [{ a: 0, x: 54 }, { a: 183, x: 53 }, { a: 26, x: 52 }, { a: 201, x: 51 }, { a: 87, x: 50 }, { a: 210, x: 49 }, { a: 221, x: 48 }, { a: 113, x: 47 }, { a: 21, x: 46 }, { a: 46, x: 45 }, { a: 65, x: 44 }, { a: 45, x: 43 }, { a: 50, x: 42 }, { a: 238, x: 41 }, { a: 184, x: 40 }, { a: 249, x: 39 }, { a: 225, x: 38 }, { a: 102, x: 37 }, { a: 58, x: 36 }, { a: 209, x: 35 }, { a: 218, x: 34 }, { a: 109, x: 33 }, { a: 165, x: 32 }, { a: 26, x: 31 }, { a: 95, x: 30 }, { a: 184, x: 29 }, { a: 192, x: 28 }, { a: 52, x: 27 }, { a: 245, x: 26 }, { a: 35, x: 25 }, { a: 254, x: 24 }, { a: 238, x: 23 }, { a: 175, x: 22 }, { a: 172, x: 21 }, { a: 79, x: 20 }, { a: 123, x: 19 }, { a: 25, x: 18 }, { a: 122, x: 17 }, { a: 43, x: 16 }, { a: 120, x: 15 }, { a: 108, x: 14 }, { a: 215, x: 13 }, { a: 80, x: 12 }, { a: 128, x: 11 }, { a: 201, x: 10 }, { a: 235, x: 9 }, { a: 8, x: 8 }, { a: 153, x: 7 }, { a: 59, x: 6 }, { a: 101, x: 5 }, { a: 31, x: 4 }, { a: 198, x: 3 }, { a: 76, x: 2 }, { a: 31, x: 1 }, { a: 156, x: 0 }],
            56: [{ a: 0, x: 56 }, { a: 106, x: 55 }, { a: 120, x: 54 }, { a: 107, x: 53 }, { a: 157, x: 52 }, { a: 164, x: 51 }, { a: 216, x: 50 }, { a: 112, x: 49 }, { a: 116, x: 48 }, { a: 2, x: 47 }, { a: 91, x: 46 }, { a: 248, x: 45 }, { a: 163, x: 44 }, { a: 36, x: 43 }, { a: 201, x: 42 }, { a: 202, x: 41 }, { a: 229, x: 40 }, { a: 6, x: 39 }, { a: 144, x: 38 }, { a: 254, x: 37 }, { a: 155, x: 36 }, { a: 135, x: 35 }, { a: 208, x: 34 }, { a: 170, x: 33 }, { a: 209, x: 32 }, { a: 12, x: 31 }, { a: 139, x: 30 }, { a: 127, x: 29 }, { a: 142, x: 28 }, { a: 182, x: 27 }, { a: 249, x: 26 }, { a: 177, x: 25 }, { a: 174, x: 24 }, { a: 190, x: 23 }, { a: 28, x: 22 }, { a: 10, x: 21 }, { a: 85, x: 20 }, { a: 239, x: 19 }, { a: 184, x: 18 }, { a: 101, x: 17 }, { a: 124, x: 16 }, { a: 152, x: 15 }, { a: 206, x: 14 }, { a: 96, x: 13 }, { a: 23, x: 12 }, { a: 163, x: 11 }, { a: 61, x: 10 }, { a: 27, x: 9 }, { a: 196, x: 8 }, { a: 247, x: 7 }, { a: 151, x: 6 }, { a: 154, x: 5 }, { a: 202, x: 4 }, { a: 207, x: 3 }, { a: 20, x: 2 }, { a: 61, x: 1 }, { a: 10, x: 0 }],
            58: [{ a: 0, x: 58 }, { a: 82, x: 57 }, { a: 116, x: 56 }, { a: 26, x: 55 }, { a: 247, x: 54 }, { a: 66, x: 53 }, { a: 27, x: 52 }, { a: 62, x: 51 }, { a: 107, x: 50 }, { a: 252, x: 49 }, { a: 182, x: 48 }, { a: 200, x: 47 }, { a: 185, x: 46 }, { a: 235, x: 45 }, { a: 55, x: 44 }, { a: 251, x: 43 }, { a: 242, x: 42 }, { a: 210, x: 41 }, { a: 144, x: 40 }, { a: 154, x: 39 }, { a: 237, x: 38 }, { a: 176, x: 37 }, { a: 141, x: 36 }, { a: 192, x: 35 }, { a: 248, x: 34 }, { a: 152, x: 33 }, { a: 249, x: 32 }, { a: 206, x: 31 }, { a: 85, x: 30 }, { a: 253, x: 29 }, { a: 142, x: 28 }, { a: 65, x: 27 }, { a: 165, x: 26 }, { a: 125, x: 25 }, { a: 23, x: 24 }, { a: 24, x: 23 }, { a: 30, x: 22 }, { a: 122, x: 21 }, { a: 240, x: 20 }, { a: 214, x: 19 }, { a: 6, x: 18 }, { a: 129, x: 17 }, { a: 218, x: 16 }, { a: 29, x: 15 }, { a: 145, x: 14 }, { a: 127, x: 13 }, { a: 134, x: 12 }, { a: 206, x: 11 }, { a: 245, x: 10 }, { a: 117, x: 9 }, { a: 29, x: 8 }, { a: 41, x: 7 }, { a: 63, x: 6 }, { a: 159, x: 5 }, { a: 142, x: 4 }, { a: 233, x: 3 }, { a: 125, x: 2 }, { a: 148, x: 1 }, { a: 123, x: 0 }],
            60: [{ a: 0, x: 60 }, { a: 107, x: 59 }, { a: 140, x: 58 }, { a: 26, x: 57 }, { a: 12, x: 56 }, { a: 9, x: 55 }, { a: 141, x: 54 }, { a: 243, x: 53 }, { a: 197, x: 52 }, { a: 226, x: 51 }, { a: 197, x: 50 }, { a: 219, x: 49 }, { a: 45, x: 48 }, { a: 211, x: 47 }, { a: 101, x: 46 }, { a: 219, x: 45 }, { a: 120, x: 44 }, { a: 28, x: 43 }, { a: 181, x: 42 }, { a: 127, x: 41 }, { a: 6, x: 40 }, { a: 100, x: 39 }, { a: 247, x: 38 }, { a: 2, x: 37 }, { a: 205, x: 36 }, { a: 198, x: 35 }, { a: 57, x: 34 }, { a: 115, x: 33 }, { a: 219, x: 32 }, { a: 101, x: 31 }, { a: 109, x: 30 }, { a: 160, x: 29 }, { a: 82, x: 28 }, { a: 37, x: 27 }, { a: 38, x: 26 }, { a: 238, x: 25 }, { a: 49, x: 24 }, { a: 160, x: 23 }, { a: 209, x: 22 }, { a: 121, x: 21 }, { a: 86, x: 20 }, { a: 11, x: 19 }, { a: 124, x: 18 }, { a: 30, x: 17 }, { a: 181, x: 16 }, { a: 84, x: 15 }, { a: 25, x: 14 }, { a: 194, x: 13 }, { a: 87, x: 12 }, { a: 65, x: 11 }, { a: 102, x: 10 }, { a: 190, x: 9 }, { a: 220, x: 8 }, { a: 70, x: 7 }, { a: 27, x: 6 }, { a: 209, x: 5 }, { a: 16, x: 4 }, { a: 89, x: 3 }, { a: 7, x: 2 }, { a: 33, x: 1 }, { a: 240, x: 0 }],
            62: [{ a: 0, x: 62 }, { a: 65, x: 61 }, { a: 202, x: 60 }, { a: 113, x: 59 }, { a: 98, x: 58 }, { a: 71, x: 57 }, { a: 223, x: 56 }, { a: 248, x: 55 }, { a: 118, x: 54 }, { a: 214, x: 53 }, { a: 94, x: 52 }, { a: 0, x: 51 }, { a: 122, x: 50 }, { a: 37, x: 49 }, { a: 23, x: 48 }, { a: 2, x: 47 }, { a: 228, x: 46 }, { a: 58, x: 45 }, { a: 121, x: 44 }, { a: 7, x: 43 }, { a: 105, x: 42 }, { a: 135, x: 41 }, { a: 78, x: 40 }, { a: 243, x: 39 }, { a: 118, x: 38 }, { a: 70, x: 37 }, { a: 76, x: 36 }, { a: 223, x: 35 }, { a: 89, x: 34 }, { a: 72, x: 33 }, { a: 50, x: 32 }, { a: 70, x: 31 }, { a: 111, x: 30 }, { a: 194, x: 29 }, { a: 17, x: 28 }, { a: 212, x: 27 }, { a: 126, x: 26 }, { a: 181, x: 25 }, { a: 35, x: 24 }, { a: 221, x: 23 }, { a: 117, x: 22 }, { a: 235, x: 21 }, { a: 11, x: 20 }, { a: 229, x: 19 }, { a: 149, x: 18 }, { a: 147, x: 17 }, { a: 123, x: 16 }, { a: 213, x: 15 }, { a: 40, x: 14 }, { a: 115, x: 13 }, { a: 6, x: 12 }, { a: 200, x: 11 }, { a: 100, x: 10 }, { a: 26, x: 9 }, { a: 246, x: 8 }, { a: 182, x: 7 }, { a: 218, x: 6 }, { a: 127, x: 5 }, { a: 215, x: 4 }, { a: 36, x: 3 }, { a: 186, x: 2 }, { a: 110, x: 1 }, { a: 106, x: 0 }],
            64: [{ a: 0, x: 64 }, { a: 45, x: 63 }, { a: 51, x: 62 }, { a: 175, x: 61 }, { a: 9, x: 60 }, { a: 7, x: 59 }, { a: 158, x: 58 }, { a: 159, x: 57 }, { a: 49, x: 56 }, { a: 68, x: 55 }, { a: 119, x: 54 }, { a: 92, x: 53 }, { a: 123, x: 52 }, { a: 177, x: 51 }, { a: 204, x: 50 }, { a: 187, x: 49 }, { a: 254, x: 48 }, { a: 200, x: 47 }, { a: 78, x: 46 }, { a: 141, x: 45 }, { a: 149, x: 44 }, { a: 119, x: 43 }, { a: 26, x: 42 }, { a: 127, x: 41 }, { a: 53, x: 40 }, { a: 160, x: 39 }, { a: 93, x: 38 }, { a: 199, x: 37 }, { a: 212, x: 36 }, { a: 29, x: 35 }, { a: 24, x: 34 }, { a: 145, x: 33 }, { a: 156, x: 32 }, { a: 208, x: 31 }, { a: 150, x: 30 }, { a: 218, x: 29 }, { a: 209, x: 28 }, { a: 4, x: 27 }, { a: 216, x: 26 }, { a: 91, x: 25 }, { a: 47, x: 24 }, { a: 184, x: 23 }, { a: 146, x: 22 }, { a: 47, x: 21 }, { a: 140, x: 20 }, { a: 195, x: 19 }, { a: 195, x: 18 }, { a: 125, x: 17 }, { a: 242, x: 16 }, { a: 238, x: 15 }, { a: 63, x: 14 }, { a: 99, x: 13 }, { a: 108, x: 12 }, { a: 140, x: 11 }, { a: 230, x: 10 }, { a: 242, x: 9 }, { a: 31, x: 8 }, { a: 204, x: 7 }, { a: 11, x: 6 }, { a: 178, x: 5 }, { a: 243, x: 4 }, { a: 217, x: 3 }, { a: 156, x: 2 }, { a: 213, x: 1 }, { a: 231, x: 0 }],
            66: [{ a: 0, x: 66 }, { a: 5, x: 65 }, { a: 118, x: 64 }, { a: 222, x: 63 }, { a: 180, x: 62 }, { a: 136, x: 61 }, { a: 136, x: 60 }, { a: 162, x: 59 }, { a: 51, x: 58 }, { a: 46, x: 57 }, { a: 117, x: 56 }, { a: 13, x: 55 }, { a: 215, x: 54 }, { a: 81, x: 53 }, { a: 17, x: 52 }, { a: 139, x: 51 }, { a: 247, x: 50 }, { a: 197, x: 49 }, { a: 171, x: 48 }, { a: 95, x: 47 }, { a: 173, x: 46 }, { a: 65, x: 45 }, { a: 137, x: 44 }, { a: 178, x: 43 }, { a: 68, x: 42 }, { a: 111, x: 41 }, { a: 95, x: 40 }, { a: 101, x: 39 }, { a: 41, x: 38 }, { a: 72, x: 37 }, { a: 214, x: 36 }, { a: 169, x: 35 }, { a: 197, x: 34 }, { a: 95, x: 33 }, { a: 7, x: 32 }, { a: 44, x: 31 }, { a: 154, x: 30 }, { a: 77, x: 29 }, { a: 111, x: 28 }, { a: 236, x: 27 }, { a: 40, x: 26 }, { a: 121, x: 25 }, { a: 143, x: 24 }, { a: 63, x: 23 }, { a: 87, x: 22 }, { a: 80, x: 21 }, { a: 253, x: 20 }, { a: 240, x: 19 }, { a: 126, x: 18 }, { a: 217, x: 17 }, { a: 77, x: 16 }, { a: 34, x: 15 }, { a: 232, x: 14 }, { a: 106, x: 13 }, { a: 50, x: 12 }, { a: 168, x: 11 }, { a: 82, x: 10 }, { a: 76, x: 9 }, { a: 146, x: 8 }, { a: 67, x: 7 }, { a: 106, x: 6 }, { a: 171, x: 5 }, { a: 25, x: 4 }, { a: 132, x: 3 }, { a: 93, x: 2 }, { a: 45, x: 1 }, { a: 105, x: 0 }],
            68: [{ a: 0, x: 68 }, { a: 247, x: 67 }, { a: 159, x: 66 }, { a: 223, x: 65 }, { a: 33, x: 64 }, { a: 224, x: 63 }, { a: 93, x: 62 }, { a: 77, x: 61 }, { a: 70, x: 60 }, { a: 90, x: 59 }, { a: 160, x: 58 }, { a: 32, x: 57 }, { a: 254, x: 56 }, { a: 43, x: 55 }, { a: 150, x: 54 }, { a: 84, x: 53 }, { a: 101, x: 52 }, { a: 190, x: 51 }, { a: 205, x: 50 }, { a: 133, x: 49 }, { a: 52, x: 48 }, { a: 60, x: 47 }, { a: 202, x: 46 }, { a: 165, x: 45 }, { a: 220, x: 44 }, { a: 203, x: 43 }, { a: 151, x: 42 }, { a: 93, x: 41 }, { a: 84, x: 40 }, { a: 15, x: 39 }, { a: 84, x: 38 }, { a: 253, x: 37 }, { a: 173, x: 36 }, { a: 160, x: 35 }, { a: 89, x: 34 }, { a: 227, x: 33 }, { a: 52, x: 32 }, { a: 199, x: 31 }, { a: 97, x: 30 }, { a: 95, x: 29 }, { a: 231, x: 28 }, { a: 52, x: 27 }, { a: 177, x: 26 }, { a: 41, x: 25 }, { a: 125, x: 24 }, { a: 137, x: 23 }, { a: 241, x: 22 }, { a: 166, x: 21 }, { a: 225, x: 20 }, { a: 118, x: 19 }, { a: 2, x: 18 }, { a: 54, x: 17 }, { a: 32, x: 16 }, { a: 82, x: 15 }, { a: 215, x: 14 }, { a: 175, x: 13 }, { a: 198, x: 12 }, { a: 43, x: 11 }, { a: 238, x: 10 }, { a: 235, x: 9 }, { a: 27, x: 8 }, { a: 101, x: 7 }, { a: 184, x: 6 }, { a: 127, x: 5 }, { a: 3, x: 4 }, { a: 5, x: 3 }, { a: 8, x: 2 }, { a: 163, x: 1 }, { a: 238, x: 0 }],
        },
        Mask: {
            0: (i, j) => { return (i + j) % 2 === 0; },
            1: (i, j) => { return i % 2 === 0; },
            2: (i, j) => { return j % 3 === 0; },
            3: (i, j) => { return (i + j) % 3 === 0; },
            4: (i, j) => { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; },
            5: (i, j) => { return (i * j) % 2 + (i * j) % 3 === 0; },
            6: (i, j) => { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; },
            7: (i, j) => { return ((i * j) % 3 + (i + j) % 2) % 2 === 0; },
        },
    };
})(QRLite || (QRLite = {}));
