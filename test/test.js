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
function CompareBitmap(src, qr) {
    if (src.length !== qr.length) {
        return false;
    }
    for (let i = 0; i < src.length; ++i) {
        if (src[i] !== qr[i]) {
            return false;
        }
    }
    return true;
}
function RunTest(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield ReadText(path.join(dir, 'test.txt'));
        const sample = yield ReadFile(path.join(dir, 'sample.bmp'));
        const [num, ver, level] = dir.split('_');
        const qr = new QR.Generator();
        const newlevel = qr.setLevel(level);
        console.log('Start:', dir, newlevel, data);
        const rawdata = qr.setData(data);
        const datacode = qr.createDataCode();
        qr.drawData(datacode[0], datacode[1]);
        const masked = qr.createMaskedQRCode();
        console.log(qr.evaluateQRCode(masked));
        const masknum = qr.selectQRCode(masked);
        fs.writeFileSync(path.join(dir, 'qr_.bmp'), Buffer.from(qr.get().outputBitmapByte(0)));
        let answer = false;
        let mask = -1;
        masked.forEach((qr, index) => {
            const compare = CompareBitmap(sample, qr.outputBitmapByte(0));
            fs.writeFileSync(path.join(dir, 'qr_' + index + '.bmp'), Buffer.from(qr.outputBitmapByte(0)));
            if (compare) {
                mask = index;
            }
            answer = answer || compare;
        });
        console.log('End:', dir, mask);
        return answer;
    });
}
function Main(base = './test/') {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = yield Readdir(base, true);
        console.log(dirs);
        for (let i = 0; i < dirs.length; ++i) {
            const result = yield RunTest(dirs[i]);
            if (!result) {
                throw 'Error: ' + dirs[i];
            }
        }
    });
}
Main().then(() => { console.log('Complete.'); }).catch((error) => { console.error(error); });
