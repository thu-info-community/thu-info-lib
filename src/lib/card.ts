import {roam} from "./core";
import {InfoHelper} from "../index";
import {setCookie, uFetch} from "../utils/network";
import {
    CARD_CANCEL_LOSS_URL,
    CARD_INFO_BY_USER_URL,
    CARD_LOGIN_URL,
    CARD_PHOTO_URL, CARD_RECHARGE_FROM_BANK_URL, CARD_RECHARGE_FROM_WECHAT_ALIPAY_URL, CARD_REPORT_LOSS_URL,
    CARD_TRANSACTION_URL,
    CARD_USER_BY_TOKEN_URL,
} from "../constants/strings";
import {CardInfo} from "../models/card/info";
import {CardTransaction, CardTransactionType} from "../models/card/transaction";

const accountBaseInfo = {
    user: "",
    cardId: "",
};

const parseResultData : any = (data: string) => {
    const result = JSON.parse(data);
    if (result.success !== true) {
        throw new Error(result.message);
    }
    return result.resultData;
};

export const cardLogin = async (helper: InfoHelper): Promise<string> => {
    const redirectUrl = await roam(helper, "card", "051bb58cba58a1c5f67857606497387f");
    const ticket = new RegExp(/ticket=(\w*?)$/).exec(redirectUrl)![1];
    const token = parseResultData(await uFetch(CARD_LOGIN_URL, {ticket: ticket})).token;
    setCookie("token", token);
    accountBaseInfo.user = parseResultData(await uFetch(CARD_USER_BY_TOKEN_URL)).loginuser;
    return accountBaseInfo.user;
};

export const cardGetInfo = async (helper: InfoHelper): Promise<CardInfo> => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    const rawInfoStruct = parseResultData(await uFetch(CARD_INFO_BY_USER_URL), {idserial: accountBaseInfo.user});

    const info: CardInfo = {
        userId: rawInfoStruct.idserial,
        userName: rawInfoStruct.username,
        userNameEn: rawInfoStruct.engname,
        departmentName: rawInfoStruct.departname,
        departmentNameEn: rawInfoStruct.engdepartname,
        departmentId: rawInfoStruct.departid,
        photoFileName: rawInfoStruct.photofile,
        phoneNumber: rawInfoStruct.tel,
        userGender: rawInfoStruct.sex,
        effectiveTimestamp: new Date(rawInfoStruct.identifyeffectdate),
        validTimestamp: new Date(rawInfoStruct.validatevalue),
        balance: rawInfoStruct.baseAccount.balance / 100,
        cardId: rawInfoStruct.cardInfos[0].cardid,
        cardStatus: rawInfoStruct.cardInfos[0].accstatus,
        lastTransactionTimestamp: new Date(rawInfoStruct.cardInfos[0].lasttxdate),
        maxDailyTransactionAmount: rawInfoStruct.cardInfos[0].maxconstolamt / 100,
        maxOneTimeTransactionAmount: rawInfoStruct.cardInfos[0].maxconsamt / 100,
    };

    accountBaseInfo.cardId = info.cardId;
    return info;
};

export const cardGetPhotoUrl = () => CARD_PHOTO_URL + accountBaseInfo.cardId;

export const cardGetTransactions = async (
    helper: InfoHelper,
    start: Date,
    end: Date,
    type: CardTransactionType = CardTransactionType.Any)
    : Promise<CardTransaction[]> => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    const rawTransactionsData = parseResultData(await uFetch(CARD_TRANSACTION_URL),
        {
            idserial: accountBaseInfo.user,
            starttime: start.toISOString().slice(0, 10),
            endtime: end.toISOString().slice(0, 10),
            tradetype: type,
        });

    return rawTransactionsData.rows.map((rawTransaction: any) => ({
        summary: rawTransaction.summary,
        type: CardTransactionType.Any, // TODO: parse type
        timestamp: new Date(rawTransaction.txdate),
        balance: rawTransaction.balance / 100,
        amount: rawTransaction.txamt / 100,
    }));
};

export const cardReportLoss = async (helper: InfoHelper, transactionPassword: string) => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    parseResultData(await uFetch(CARD_REPORT_LOSS_URL),
        {
            idserial: accountBaseInfo.user,
            txpasswd: transactionPassword,
        });
};

export const cardCancelLoss = async (helper: InfoHelper, transactionPassword: string) => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    parseResultData(await uFetch(CARD_CANCEL_LOSS_URL),
        {
            idserial: accountBaseInfo.user,
            txpasswd: transactionPassword,
        });
};

export const cardRechargeFromBank = async (helper: InfoHelper, transactionPassword: string, amount: number) => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    parseResultData(await uFetch(CARD_RECHARGE_FROM_BANK_URL),
        {
            idserial: accountBaseInfo.user,
            txamt: Math.floor(amount * 100),
        });
};

const enum CardRechargeType {
    Wechat = "综合服务微信扫码充值",
    Alipay = "综合服务支付宝扫码充值",
}

export const cardRechargeFromWechatAlipay = async (helper: InfoHelper, amount: number, alipay: boolean)
    : Promise<string> => {
    if (accountBaseInfo.user === "") {
        await cardLogin(helper);
    }

    const rawResponse = parseResultData(await uFetch(CARD_RECHARGE_FROM_WECHAT_ALIPAY_URL),
        {
            idserial: accountBaseInfo.user,
            transamt: amount,
            paytype: alipay ? 3 : 2,
            productdesc: alipay ? CardRechargeType.Alipay : CardRechargeType.Wechat,
            method: "trade.pay.qrcode",
            tradetype: alipay ? "alipay.qrcode" : "weixin.qrcode",
        });

    if (rawResponse.success !== true) {
        throw new Error(rawResponse.message);
    }

    return JSON.parse(rawResponse.response).bizContent.webUrl;
};
