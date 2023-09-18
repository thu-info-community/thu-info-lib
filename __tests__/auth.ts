import {expect, it} from "@jest/globals";
import {InfoHelper} from "../src";
import dayjs from "dayjs";

let userId = "";
let password = "";

try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const secrets = require("../secrets.json");
    userId = secrets.userId;
    password = secrets.password;
} catch (e) {
    userId = process.env.INFO_USER_ID!;
    password = process.env.INFO_PASSWORD!;
}

it("should enter mocked account", async () => {
    const helper = new InfoHelper();
    await helper.login({userId: "8888", password: "8888"});
    expect(helper.mocked()).toEqual(true);
    await helper.logout();
}, 60000);

it("should login successfully.", async () => {
    const helper = new InfoHelper();
    await helper.login({userId, password});
    const {firstDay} = await helper.getCalendar();
    expect(dayjs(firstDay).day()).toEqual(1);
    expect((await helper.getCrTimetable()).length).toBeGreaterThan(0);
    expect((await helper.getCampusCardInfo()).balance).toBeGreaterThanOrEqual(0);
    await helper.logout();
    expect(helper.mocked()).toEqual(false);
}, 60000);
