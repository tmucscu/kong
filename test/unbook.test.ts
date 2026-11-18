import { command, NOW, reply, selectMenu, send, seedBooking } from "./helpers";

describe("/unbook", () => {
  it("lists a Member's own future Bookings, ephemerally, with a select to pick one", async () => {
    await seedBooking({ userId: "100", date: "2026-11-18", start: "14:00", end: "15:30" });

    const body = await reply(await send(command("unbook"), { now: NOW }));

    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toContain("1. November 18, 2:00 PM to 3:30 PM, <@100>");
    expect(body.data?.components?.[0]?.components[0]?.options?.map((o: { label: string }) => o.label)).toEqual([
      "1. Nov 18 2:00 PM to 3:30 PM",
    ]);
  });

  it("lets a Member delete their own Booking, announces it publicly and removes it from /bookings", async () => {
    await seedBooking({ userId: "100", date: "2026-11-18", start: "14:00", end: "15:30" });
    const list = await reply(await send(command("unbook"), { now: NOW }));
    const select = list.data!.components![0].components[0];

    const response = await reply(await send(selectMenu(select.custom_id, [select.options![0].value]), { now: NOW }));

    expect(response.type).toBe(4);
    expect(response.data?.flags).toBeUndefined();
    expect(response.data?.content).toBe("<@100> has deleted their booking on November 18 from 2:00 PM to 3:30 PM");
    expect(response.data?.allowed_mentions).toEqual({ parse: [] });
    const bookings = await reply(await send(command("bookings"), { now: NOW }));
    expect(bookings.data?.embeds?.[0]?.description).toBe("The office is free all week!");
  });

  it("shows an Admin everyone's future Bookings and announces when they remove someone else's", async () => {
    await seedBooking({ userId: "200", date: "2026-11-19", start: "09:00", end: "10:30" });
    await seedBooking({ userId: "100", date: "2026-11-20", start: "09:00", end: "10:00" });
    const adminList = command("unbook", { userId: "900", admin: true });

    const list = await reply(await send(adminList, { now: NOW }));
    expect(list.data?.content).toBe(
      [
        "Pick a booking to delete:",
        "1. November 19, 9:00 AM to 10:30 AM, <@200>",
        "2. November 20, 9:00 AM to 10:00 AM, <@100>",
      ].join("\n"),
    );

    const select = list.data!.components![0].components[0];
    const response = await reply(
      await send(selectMenu(select.custom_id, [select.options![0].value], { userId: "900", admin: true }), { now: NOW }),
    );

    expect(response.type).toBe(4);
    expect(response.data?.flags).toBeUndefined();
    expect(response.data?.content).toBe("<@900> removed <@200>'s booking on November 19 from 9:00 AM to 10:30 AM");
    expect(response.data?.allowed_mentions).toEqual({ parse: [] });
    const after = await reply(await send(command("bookings"), { now: NOW }));
    expect(after.data?.embeds?.[0]?.description).toBe("**November 20**\n9:00 AM to 10:00 AM for <@100>");
  });

  it("refuses a Member who replays a select for someone else's Booking, and leaves it booked", async () => {
    await seedBooking({ userId: "200", date: "2026-11-19", start: "09:00", end: "10:30" });
    const adminList = await reply(await send(command("unbook", { userId: "900", admin: true }), { now: NOW }));
    const bookingId = adminList.data!.components![0].components[0].options![0].value;

    const response = await reply(await send(selectMenu("unbook", [bookingId], { userId: "100" }), { now: NOW }));

    expect(response.type).toBe(4);
    expect(response.data?.flags).toBe(64);
    expect(response.data?.content).toBe("You can only delete your own bookings.");
    const after = await reply(await send(command("bookings"), { now: NOW }));
    expect(after.data?.embeds?.[0]?.description).toBe("**November 19**\n9:00 AM to 10:30 AM for <@200>");
  });

  it("gives a friendly ephemeral message when the picked Booking was already deleted", async () => {
    await seedBooking({ userId: "100", date: "2026-11-18", start: "14:00", end: "15:30" });
    const list = await reply(await send(command("unbook"), { now: NOW }));
    const select = list.data!.components![0].components[0];
    const pick = selectMenu(select.custom_id, [select.options![0].value]);
    await send(pick, { now: NOW });

    const response = await reply(await send(pick, { now: NOW }));

    expect(response.type).toBe(4);
    expect(response.data?.flags).toBe(64);
    expect(response.data?.content).toBe("That booking no longer exists.");
  });

  it("does not treat other permissions as Admin; only Manage Server counts", async () => {
    await seedBooking({ userId: "200", date: "2026-11-19", start: "09:00", end: "10:30" });
    const manageMessagesOnly = command("unbook", { userId: "100" });
    manageMessagesOnly.member.permissions = String(1n << 13n);

    const body = await reply(await send(manageMessagesOnly, { now: NOW }));

    expect(body.data?.content).toBe("You have no bookings to delete!");
  });

  it("offers at most the 25 soonest Bookings", async () => {
    for (let day = 1; day <= 28; day++) {
      await seedBooking({ userId: "100", date: `2026-12-${String(day).padStart(2, "0")}`, start: "09:00", end: "10:00" });
    }

    const body = await reply(await send(command("unbook"), { now: NOW }));

    const options = body.data!.components![0].components[0].options!;
    expect(options).toHaveLength(25);
    expect(options[24].label).toBe("25. Dec 25 9:00 AM to 10:00 AM");
    expect(body.data?.content).not.toContain("26.");
  });

  it("tells a Member with no future Bookings that there is nothing to delete, without a select", async () => {
    await seedBooking({ userId: "200", date: "2026-11-19", start: "09:00", end: "10:00" });

    const body = await reply(await send(command("unbook"), { now: NOW }));

    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toBe("You have no bookings to delete!");
    expect(body.data?.components).toBeUndefined();
  });

  it("leaves out other Members' Bookings and Bookings that have already ended, but keeps today's not-yet-ended one", async () => {
    await seedBooking({ userId: "100", date: "2026-11-17", start: "09:00", end: "10:00" }); // yesterday
    await seedBooking({ userId: "100", date: "2026-11-18", start: "09:00", end: "11:59" }); // ended today
    await seedBooking({ userId: "100", date: "2026-11-18", start: "11:00", end: "12:01" }); // still running
    await seedBooking({ userId: "200", date: "2026-11-19", start: "09:00", end: "10:00" }); // someone else's
    await seedBooking({ userId: "100", date: "2026-11-20", start: "22:00", end: "24:00" }); // ends at midnight

    const body = await reply(await send(command("unbook"), { now: NOW }));

    expect(body.data?.content).toBe(
      [
        "Pick a booking to delete:",
        "1. November 18, 11:00 AM to 12:01 PM, <@100>",
        "2. November 20, 10:00 PM to 12:00 AM, <@100>",
      ].join("\n"),
    );
  });
});
