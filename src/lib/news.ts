import {uFetch} from "../utils/network";
import cheerio from "cheerio";
import {newsHtml} from "../mocks/source/newsHtml";
import {NewsSlice, SourceTag} from "../models/news/news";
import {InfoHelper} from "../index";
import {getCheerioText} from "../utils/cheerio";
import {retryWrapperWithMocks} from "./core";
import {MOCK_NEWS_LIST} from "../mocks/news";
import {BGTZ_MAIN_PREFIX, HB_MAIN_PREFIX, JWGG_MAIN_PREFIX, KYTZ_MAIN_PREFIX} from "../constants/strings";

const channelToUrl: {[key in SourceTag]: string} = {
    "JWGG": JWGG_MAIN_PREFIX,
    "BGTZ": BGTZ_MAIN_PREFIX,
    "KYTZ": KYTZ_MAIN_PREFIX,
    "HB": HB_MAIN_PREFIX,
};

export const getNewsList = (
    helper: InfoHelper,
    channel: SourceTag,
    page: number,
): Promise<NewsSlice[]> =>
    retryWrapperWithMocks(
        helper,
        undefined,
        () => uFetch(channelToUrl[channel] + page).then((str) => {
            const $ = cheerio.load(str);
            const newsList: NewsSlice[] = [];
            $("ul.cont_list > li", str).each((_, item) => {
                if (item.type === "tag" && item.children[3].type === "tag") {
                    let newsUrl: string = item.children[3].attribs.href;
                    if (newsUrl[0] === "/") {
                        newsUrl = "https://webvpn.tsinghua.edu.cn" + newsUrl;
                    }
                    newsList.push(
                        {
                            name: getCheerioText(item, 3),
                            url: newsUrl,
                            date: getCheerioText(item, 7),
                            source: item.children[4].data?.substr(
                                3,
                                item.children[4].data?.length - 5,
                            ) ?? "",
                            channel,
                        },
                    );
                }
            });
            return newsList;
        }),
        MOCK_NEWS_LIST(channel),
    );

const policyList: [string, [string, string]][] = [
    ["jwcbg", [".TD4", "td[colspan=4]:not(td[height])"]],
    [
        "kybg",
        [".style1", "table[width='95%'][cellpadding='3'] tr:nth-child(3)"],
    ],
    ["gjc", [".style11", "[width='85%'] td"]],
    [
        "77726476706e69737468656265737421f2fa598421322653770bc7b88b5c2d32530b094045c3bd5cabf3",
        [".TD1", "td[colspan=4]:not(td[height])"],
    ],
    [
        "77726476706e69737468656265737421e0f852882e3e6e5f301c9aa596522b2043f84ba24ebecaf8",
        [".cont_doc_box h5 span", "div.field-item"],
    ],
    [
        "77726476706e69737468656265737421e9fd528569336153301c9aa596522b20735d12f268e561f0",
        [
            "h3",
            "[style='text-align:left; width:90%; magin:0px auto; padding-top:20px;  padding-bottom:20px;word-break:break-all;']",
        ],
    ],
    [
        "77726476706e69737468656265737421f8e60f8834396657761d88e29d51367b523e",
        ["h1", ".r_cont > ul"],
    ],
    [
        "77726476706e69737468656265737421e8ef439b69336153301c9aa596522b20e1a870705b76e399",
        ["", ".td4"],
    ],
    ["rscbg", ["[height=40]", "[width='95%'] > tr:nth-child(3)"]],
    [
        "77726476706e69737468656265737421e7e056d234297b437c0bc7b88b5c2d3212b31e4d37621d4714d6",
        ["", "[style='text-align:left']"],
    ],
    ["ghxt", ["", "[valign=top]:not([class])"]],
    [
        "fgc",
        [
            ".title_b",
            "[style='width:647px;margin-left:6px;font-size:13px;line-height:20px;text-align:justify']",
        ],
    ],
    [
        "77726476706e69737468656265737421e8e442d23323615e79009cadd6502720f9b87b",
        [
            ".bt",
            ".xqbox",
        ],
    ],
    [
        "77726476706e69737468656265737421e4ff459d207e6b597d469dbf915b243de94c4812e5c2e1599f",
        [
            ".TD_right > font",
            "td[colspan=4]:not(td[height])",
        ],
    ],
    [
        "jdbsc",
        [
            ".TD1",
            "[width=95%]:nth-child(2) > tr:nth-child(1)",
        ],
    ],
];

const getNewsDetailPolicy = (
    url: string,
): [string | undefined, string | undefined] => {
    for (let i = 0; i < policyList.length; ++i) {
        if (url.indexOf(policyList[i][0]) !== -1) {
            return policyList[i][1];
        }
    }
    return [undefined, undefined];
};

export const getNewsDetail = async (
    helper: InfoHelper,
    url: string,
): Promise<[string, string, string]> => {
    const [title, content] = getNewsDetailPolicy(url);
    const html = helper.mocked() ? newsHtml[url] ?? "" : await uFetch(url);
    if (title !== undefined && content) {
        const r = cheerio(content, html);
        return [
            cheerio(title, html).text(),
            r.html() ?? "",
            r.text().replace(/\s/g, ""),
        ];
    } else {
        return ["", html, ""];
    }
};
