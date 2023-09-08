import {roamingWrapperWithMocks} from "./core";
import {
    JXRL_MIDDLE,
    JXRL_BKS_PREFIX,
    JXRL_SUFFIX,
    SECONDARY_URL,
    JXRL_YJS_PREFIX,
} from "../constants/strings";
import {
    Schedule,
    mergeSchedules,
    parseJSON,
    parseScript,
} from "../models/schedule/schedule";
import {CalendarData} from "../models/schedule/calendar";
import {InfoHelper} from "../index";
import {uFetch} from "../utils/network";
import {
    MOCK_PRIMARY_SCHEDULE,
    MOCK_SECONDARY_SCHEDULE,
} from "../mocks/schedule";
import {ScheduleError} from "../utils/error";
import {getCalendar} from "./basics";
import dayjs from "dayjs";

const GROUP_SIZE = 3; // Make sure that `GROUP_SIZE` is a divisor of `weekCount`.

const getPrimary = (helper: InfoHelper, {firstDay, weekCount}: CalendarData) =>
    roamingWrapperWithMocks(
        helper,
        "default",
        helper.graduate() ? "BEABB32641DC4EC3510B048BAF42471A": "287C0C6D90ABB364CD5FDF1495199962",
        () => Promise.all(
            Array.from(new Array(weekCount / GROUP_SIZE), (_, id) =>
                uFetch(
                    (helper.graduate() ? JXRL_YJS_PREFIX : JXRL_BKS_PREFIX) +
                    dayjs(firstDay).add((id * GROUP_SIZE) * 7, "day").format("YYYYMMDD") +
                    JXRL_MIDDLE +
                    dayjs(firstDay).add(((id + 1) * GROUP_SIZE - 1) * 7 + 6, "day").format("YYYYMMDD") +
                    JXRL_SUFFIX,
                ),
            ),
        )
            .then((results) =>
                results
                    .map((s) => {
                        if (s[0] !== "m") {
                            throw new ScheduleError();
                        }
                        return s.substring(s.indexOf("[") + 1, s.lastIndexOf("]"));
                    })
                    .filter((s) => s.trim().length > 0)
                    .join(","),
            )
            .then((str) => parseJSON(JSON.parse(`[${str}]`), firstDay)),
        MOCK_PRIMARY_SCHEDULE,
    );

const getSecondary = (helper: InfoHelper) =>
    roamingWrapperWithMocks(
        helper,
        "default",
        helper.graduate() ? "BEABB32641DC4EC3510B048BAF42471A": "287C0C6D90ABB364CD5FDF1495199962",
        () => uFetch(SECONDARY_URL).then((str) => {
            const lowerBound = str.indexOf("function setInitValue");
            const upperBound = str.indexOf("}", lowerBound);
            return parseScript(
                str.substring(lowerBound, upperBound),
            ) as Schedule[];
        }),
        MOCK_SECONDARY_SCHEDULE,
    );

export const getSchedule = async (helper: InfoHelper) => {
    const calendarData = await getCalendar(helper);
    const scheduleList: Schedule[] = (await getPrimary(helper, calendarData)).concat(helper.graduate() ? [] : await getSecondary(helper));
    return {
        schedule: mergeSchedules(scheduleList),
        calendar: calendarData,
    };
};
