import { command, NOW, reply, send, seedBooking } from "./helpers";

describe("/bookings", () => {
  it("says the office is free when nothing is booked this week", async () => {
    const response = await send(command("bookings"), { now: NOW });

    const body = await reply(response);
    expect(body.data?.embeds?.[0]?.title).toBe("Office Bookings");
    expect(body.data?.embeds?.[0]?.description).toBe("The office is free all week!");
  });

  it("lists a booking under its day with times, who booked it and whether others can come in", async () => {
    await seedBooking({ userId: "100", date: "2026-11-18", start: "09:00", end: "10:30", othersCanCome: true });

    const body = await reply(await send(command("bookings"), { now: NOW }));

    expect(body.data?.embeds?.[0]?.description).toBe("**November 18**\n9:00 AM to 10:30 AM for <@100> [can come in]");
  });

  it("lists days and the bookings within a day in chronological order", async () => {
    await seedBooking({ userId: "2", date: "2026-11-19", start: "14:00", end: "15:00" });
    await seedBooking({ userId: "1", date: "2026-11-19", start: "08:00", end: "09:00" });
    await seedBooking({ userId: "3", date: "2026-11-18", start: "17:00", end: "18:00" });

    const body = await reply(await send(command("bookings"), { now: NOW }));

    expect(body.data?.embeds?.[0]?.description).toBe(
      [
        "**November 18**\n5:00 PM to 6:00 PM for <@3>",
        "**November 19**\n8:00 AM to 9:00 AM for <@1>\n2:00 PM to 3:00 PM for <@2>",
      ].join("\n\n"),
    );
  });

  it("shows today and the next seven days only", async () => {
    await seedBooking({ userId: "1", date: "2026-11-17", start: "10:00", end: "11:00" }); // yesterday
    await seedBooking({ userId: "2", date: "2026-11-25", start: "10:00", end: "11:00" }); // day 8: shown
    await seedBooking({ userId: "3", date: "2026-11-26", start: "10:00", end: "11:00" }); // day 9: hidden

    const body = await reply(await send(command("bookings"), { now: NOW }));

    expect(body.data?.embeds?.[0]?.description).toBe("**November 25**\n10:00 AM to 11:00 AM for <@2>");
  });

  it("decides what today is in Toronto time, not UTC", async () => {
    await seedBooking({ userId: "1", date: "2026-11-18", start: "10:00", end: "11:00" });
    const lateEveningToronto = () => new Date("2026-11-19T03:00:00Z"); // 10 PM on Nov 18 in Toronto

    const body = await reply(await send(command("bookings"), { now: lateEveningToronto }));

    expect(body.data?.embeds?.[0]?.description).toBe("**November 18**\n10:00 AM to 11:00 AM for <@1>");
  });

  it("writes noon as 12 PM and an end at midnight as 12 AM", async () => {
    await seedBooking({ userId: "1", date: "2026-11-18", start: "12:00", end: "24:00" });

    const body = await reply(await send(command("bookings"), { now: NOW }));

    expect(body.data?.embeds?.[0]?.description).toBe("**November 18**\n12:00 PM to 12:00 AM for <@1>");
  });

  it("does not ping the people it mentions", async () => {
    await seedBooking({ userId: "1", date: "2026-11-18", start: "10:00", end: "11:00" });

    const body = await reply(await send(command("bookings"), { now: NOW }));

    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });
});
