import { scoreHand } from "./Score";
import { parseMelds, buildMeldCode, meldToCode } from "./meldParser";

// "11112222333344m" → 34 格陣列
const toTiles34 = (str) => {
    const arr = new Array(34).fill(0);
    const groups = str.match(/(\d+)([mpsz])/g) || [];
    groups.forEach((g) => {
        const [, nums, type] = g.match(/(\d+)([mpsz])/);
        for (const ch of nums) {
            const n = parseInt(ch, 10);
            const base = type === "m" ? 0 : type === "p" ? 9 : type === "s" ? 18 : 27;
            arr[base + n - 1]++;
        }
    });
    return arr;
};

const run = (str, winTileStr, opts = {}) => {
    const tiles34 = toTiles34(str);
    const winTiles = toTiles34(winTileStr);
    const winTile = winTiles.findIndex((c) => c > 0);
    return scoreHand({
        tiles34,
        winTile,
        tsumo: false,
        dealer: false,
        roundWind: "東",
        seatWind: "南",
        riichi: false,
        ippatsu: false,
        haitei: false,
        dora: 0,
        ...opts,
    });
};

const names = (r) => r.yaku.map((y) => y.name);

describe("手牌算點引擎", () => {
    test("11112222333344m 是清一色，絕不會是斷么九", () => {
        const r = run("11112222333344m", "4m");
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("清一色");
        expect(names(r)).not.toContain("斷么九");
        // 清一色 6 + 二盃口 3（或平和再 +1）
        expect(r.han).toBeGreaterThanOrEqual(9);
    });

    test("立直 + 一氣通貫 + 平和 = 4飜30符 7700 點", () => {
        const r = run("123m456m789m11p234s", "4s", { riichi: true });
        expect(r.ok).toBe(true);
        expect(names(r)).toEqual(expect.arrayContaining(["立直", "一氣通貫", "平和"]));
        expect(r.han).toBe(4);
        expect(r.fu).toBe(30);
        expect(r.points.ron).toBe(7700);
    });

    test("七對子：立直自摸 = 4飜25符", () => {
        const r = run("112233m445566p77z", "7z", { riichi: true, tsumo: true });
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("七對子");
        expect(r.han).toBe(4);
        expect(r.fu).toBe(25);
    });

    test("國士無雙是役滿", () => {
        const r = run("19m19p19s1234567z1z", "1z");
        expect(r.ok).toBe(true);
        expect(r.isYakuman).toBe(true);
        expect(r.han).toBe(13);
        expect(r.points.ron).toBe(32000);
    });

    test("門前榮和的基本符：平和榮和 = 30 符", () => {
        const r = run("234m345p456s678s88p", "2m");
        expect(r.ok).toBe(true);
        expect(r.fu).toBe(30);
    });

    test("副露：123m + 111p 副露、456m789m11s 門前，一氣通貫 1 飜", () => {
        const r = run("456m789m11s", "9m", {
            melds: [
                { type: "chi", tile: 0 }, // 123m
                { type: "pon", tile: 9 }, // 111p
            ],
        });
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("一氣通貫");
        expect(r.han).toBe(1);
        expect(r.fu).toBe(30);
        expect(r.points.ron).toBe(1000);
    });

    test("副露不能算門前清自摸和", () => {
        const r = run("456m789m11s", "9m", {
            tsumo: true,
            melds: [
                { type: "chi", tile: 0 },
                { type: "pon", tile: 9 },
            ],
        });
        expect(names(r)).not.toContain("門前清自摸和");
    });
    test("嶺上開花：自摸計入，且與門前清自摸和並存", () => {
        const r = run("234m345p456s678s88p", "2m", { tsumo: true, rinshan: true });
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("嶺上開花");
        expect(names(r)).toContain("門前清自摸和");
        expect(r.han).toBe(4);
        expect(r.fu).toBe(20);
    });

    test("搶槓是榮和役，不帶自摸", () => {
        const r = run("234m345p456s678s88p", "2m", { chankan: true });
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("搶槓");
        expect(names(r)).not.toContain("門前清自摸和");
        expect(r.fu).toBe(30);
    });

    test("三槓子 2 飜（三個暗槓）", () => {
        const r = run("456m99s", "6m", {
            melds: [
                { type: "ankan", tile: 0 }, // 1111m
                { type: "ankan", tile: 1 }, // 2222m
                { type: "ankan", tile: 2 }, // 3333m
            ],
        });
        expect(r.ok).toBe(true);
        expect(names(r)).toContain("三槓子");
        expect(r.han).toBeGreaterThanOrEqual(2);
    });

    test("四槓子是役滿，而且要看得到役名", () => {
        const r = run("99s", "9s", {
            melds: [
                { type: "minkan", tile: 0 }, // 1111m
                { type: "minkan", tile: 1 }, // 2222m
                { type: "ankan", tile: 2 }, // 3333m
                { type: "ankan", tile: 3 }, // 4444m
            ],
        });
        expect(r.ok).toBe(true);
        expect(r.isYakuman).toBe(true);
        expect(names(r)).toContain("四槓子");
        expect(names(r)).not.toContain("役滿");
        expect(r.han).toBe(13);
    });

    test("四個暗槓同時成立四暗刻，是雙倍役滿", () => {
        const r = run("99s", "9s", {
            melds: [
                { type: "ankan", tile: 0 },
                { type: "ankan", tile: 1 },
                { type: "ankan", tile: 2 },
                { type: "ankan", tile: 3 },
            ],
        });
        // 和了牌是雀頭 → 四暗刻單騎（26）+ 四槓子（13）= 39 飜
        expect(names(r)).toEqual(expect.arrayContaining(["四槓子", "四暗刻單騎"]));
        expect(r.han).toBe(39);
    });

    test("雙立直 2 飜，且不再重複計立直", () => {
        const r = run("123m456m789m11p234s", "4s", { riichi: true, doubleRiichi: true });
        expect(names(r)).toContain("雙立直");
        expect(names(r)).not.toContain("立直");
        expect(r.han).toBeGreaterThanOrEqual(3);
    });

    test("天和是役滿", () => {
        const r = run("123m456m789m11p234s", "4s", { tenhou: true });
        expect(r.isYakuman).toBe(true);
        expect(names(r)).toContain("天和");
    });

    test("地和是役滿（子家第一巡）", () => {
        const r = run("123m456m789m11p234s", "4s", { chiihou: true });
        expect(r.isYakuman).toBe(true);
        expect(names(r)).toContain("地和");
    });

    test("四暗刻單騎（單騎聽）是雙倍役滿", () => {
        const r = run("111222333m444p55s", "5s", { tsumo: true });
        expect(r.isYakuman).toBe(true);
        expect(names(r)).toContain("四暗刻單騎");
        expect(r.han).toBe(26);
    });
});

describe("副露語法", () => {
    test("123123123m 是三個順子，不是三個刻子", () => {
        const { melds, errors } = parseMelds("123123123m");
        expect(errors).toEqual([]);
        expect(melds.map((m) => m.type)).toEqual(["chi", "chi", "chi"]);
    });

    test("111222333m 是三個刻子，不會被當成順子", () => {
        const { melds, errors } = parseMelds("111222333m");
        expect(errors).toEqual([]);
        expect(melds.map((m) => m.type)).toEqual(["pon", "pon", "pon"]);
    });

    test("1111m 是明槓、1111m- 和 [1111m] 是暗槓", () => {
        expect(parseMelds("1111m").melds[0].type).toBe("minkan");
        expect(parseMelds("1111m-").melds[0].type).toBe("ankan");
        expect(parseMelds("[1111m]").melds[0].type).toBe("ankan");
        expect(parseMelds("1111m-").errors).toEqual([]);
    });

    test("跨花色多組：123m 555p 是吃 + 碰", () => {
        const { melds } = parseMelds("123m 555p");
        expect(melds.map((m) => m.type)).toEqual(["chi", "pon"]);
    });
});

describe("點選式副露組裝", () => {
    test("吃：順序打亂也能組出 123m", () => {
        expect(buildMeldCode("chi", ["3m", "1m", "2m"]).code).toBe("123m");
    });

    test("吃不能是字牌", () => {
        expect(buildMeldCode("chi", ["1z", "2z", "3z"]).error).toBeTruthy();
    });

    test("吃必須連續", () => {
        expect(buildMeldCode("chi", ["1m", "2m", "4m"]).error).toBeTruthy();
    });

    test("碰：555p", () => {
        expect(buildMeldCode("pon", ["5p", "5p", "5p"]).code).toBe("555p");
    });

    test("明槓與暗槓", () => {
        expect(buildMeldCode("minkan", ["1s", "1s", "1s", "1s"]).code).toBe("1111s");
        expect(buildMeldCode("ankan", ["1s", "1s", "1s", "1s"]).code).toBe("1111s-");
    });

    test("組出來的碼能被 parseMelds 還原成副露", () => {
        const { code } = buildMeldCode("ankan", ["9p", "9p", "9p", "9p"]);
        const { melds, errors } = parseMelds(code);
        expect(errors).toEqual([]);
        expect(melds[0]).toEqual({ type: "ankan", tile: 17 });
    });

    test("meldToCode：解析再序列化可以還原原字串（刪除單組時要用）", () => {
        const input = "123m 555p 1111s- 7777z";
        const { melds } = parseMelds(input);
        expect(melds.map(meldToCode).join(" ")).toBe(input);

        // 刪掉第 2 組後重建
        const remaining = melds.filter((_, i) => i !== 1);
        expect(remaining.map(meldToCode).join(" ")).toBe("123m 1111s- 7777z");
    });
});
