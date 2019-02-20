"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const QR = require('../index');
let DEBUG = false;
let BINARY = false;
let TESTS = [];
for (let i = 2; i < process.argv.length; ++i) {
    switch (process.argv[i]) {
        case '--debug':
        case '-d':
            DEBUG = true;
            break;
        case '--binary':
        case '-b':
            BINARY = true;
            break;
        default:
            TESTS.push(process.argv[i]);
    }
}
function Readdir(dir, dironly) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (error, files) => {
            if (error) {
                return reject(error);
            }
            resolve(files);
        });
    }).then((files) => {
        return files.map((f) => { return path.join(dir, f); }).filter((file) => {
            const stat = fs.statSync(file);
            return stat.isDirectory() === dironly;
        });
    });
}
function ReadText(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (error, file) => {
            if (error) {
                return reject(error);
            }
            resolve(file);
        });
    });
}
function ReadFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (error, file) => {
            if (error) {
                return reject(error);
            }
            resolve(file);
        });
    }).then((buffer) => {
        const array = [];
        for (let i = 0; i < buffer.length; ++i) {
            array.push(buffer[i]);
        }
        return array;
    });
}
function CompareText(src, qr) {
    if (src.length !== qr.length) {
        return false;
    }
    return src.replace(/\r|\n/g, '') === qr.replace(/\r|\n/g, '');
}
function RunTest(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = { generation: false, message: '', dir: dir, level: '', version: 0, score: [0], select: -1, answer: -1 };
        const data = yield ReadText(path.join(dir, 'test.txt'));
        const sample = yield ReadText(path.join(dir, 'sample.txt'));
        const [num, ver, level] = dir.split('_');
        const qr = new QR.Generator();
        result.level = qr.setLevel(level);
        const rawdata = qr.setData(data);
        result.version = qr.getVersion();
        const datacode = qr.createDataCode();
        qr.drawData(datacode[0], datacode[1]);
        const masked = qr.createMaskedQRCode();
        result.score = qr.evaluateQRCode(masked);
        result.select = qr.selectQRCode(masked);
        const option = { black: '██', white: '  ' };
        fs.writeFileSync(path.join(dir, 'qr_.txt'), qr.get().sprint(option));
        masked.forEach((qr, index) => {
            if (DEBUG) {
                console.log('Mask:', index);
            }
            const compare = CompareText(sample, qr.sprint(option));
            fs.writeFileSync(path.join(dir, 'qr_' + index + '.txt'), qr.sprint(option));
            if (compare) {
                result.answer = index;
            }
            result.generation = result.generation || compare;
        });
        if (result.select !== result.answer) {
            result.message = 'Did not choose the correct answer.';
        }
        if (result.answer < 0) {
            result.message = 'Wrong answer.';
        }
        return result;
    });
}
function CompareBitmap(src, qr) {
    if (src.length !== qr.length) {
        return false;
    }
    if (DEBUG) {
        let ans = true;
        for (let i = 0; i < src.length; ++i) {
            if (src[i] !== qr[i]) {
                ans = false;
                console.log(i, src[i], qr[i]);
            }
        }
        return ans;
    }
    else {
        for (let i = 0; i < src.length; ++i) {
            if (src[i] !== qr[i]) {
                return false;
            }
        }
    }
    return true;
}
function RunTestBMP(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = { generation: false, message: '', dir: dir, level: '', version: 0, score: [0], select: -1, answer: -1 };
        const data = yield ReadText(path.join(dir, 'test.txt'));
        const sample = yield ReadFile(path.join(dir, 'sample.bmp'));
        const [num, ver, level] = dir.split('_');
        const qr = new QR.Generator();
        result.level = qr.setLevel(level);
        const rawdata = qr.setData(data);
        result.version = qr.getVersion();
        const datacode = qr.createDataCode();
        qr.drawData(datacode[0], datacode[1]);
        const masked = qr.createMaskedQRCode();
        result.score = qr.evaluateQRCode(masked);
        result.select = qr.selectQRCode(masked);
        fs.writeFileSync(path.join(dir, 'qr_.bmp'), Buffer.from(qr.get().outputBitmapByte(0)));
        masked.forEach((qr, index) => {
            if (DEBUG) {
                console.log('Mask:', index);
            }
            const compare = CompareBitmap(sample, qr.outputBitmapByte(0));
            fs.writeFileSync(path.join(dir, 'qr_' + index + '.bmp'), Buffer.from(qr.outputBitmapByte(0)));
            if (compare) {
                result.answer = index;
            }
            result.generation = result.generation || compare;
        });
        if (result.select !== result.answer) {
            result.message = 'Did not choose the correct answer.';
        }
        if (result.answer < 0) {
            result.message = 'Wrong answer.';
        }
        return result;
    });
}
function Main(base = './test/') {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = 0 < TESTS.length ? TESTS.map((d) => { return path.join(base, d); }) : yield Readdir(base, true);
        for (let i = 0; i < dirs.length; ++i) {
            const result = yield (BINARY ? RunTestBMP(dirs[i]) : RunTest(dirs[i]));
            if (!result.generation) {
                throw ['Error: ', result.dir, '|', result.version, result.level, '|', result.select, result.answer, result.message].join(' ');
            }
            console.log(result.message ? 'Wargning:' : 'Success!:', result.dir, '|', result.version, result.level, '|', result.select, result.answer, result.score, result.message);
        }
    });
}
Main().then(() => { console.log('Complete.'); }).catch((error) => { console.error(error); });
