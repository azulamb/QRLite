import {
	Black,
	convert,
	Generator,
	Info,
	Version,
	White,
} from "../src/qrlite.ts";

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

Deno.test("Denoから公開APIをimportできる", () => {
	assert(Version === "1.1.0", "Versionが一致しません");
	assert(White === false, "Whiteがfalseではありません");
	assert(Black === true, "Blackがtrueではありません");
	assert(Info.Data[1].L.DataCode === 19, "Infoが公開されていません");
});

Deno.test("QRコードを生成できる", () => {
	const canvas = convert("test", { level: "H", mask: 7 });

	assert(canvas.width === 21, "Version 1の幅が21ではありません");
	assert(canvas.height === 21, "Version 1の高さが21ではありません");
	assert(canvas.getPixels().length === 21 * 21, "ピクセル数が不正です");
});

Deno.test("Generatorを直接利用できる", () => {
	const generator = new Generator();
	const canvas = generator.convert("https://google.com/", {
		level: "Q",
		mask: 6,
	});

	assert(generator.getVersion() === 2, "想定したVersionではありません");
	assert(generator.getLastMask() === 6, "指定したマスクではありません");
	assert(canvas.width === 25, "Version 2の幅が25ではありません");
});
