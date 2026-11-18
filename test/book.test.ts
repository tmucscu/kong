import { allComponents, command, componentClick, modalSubmit, NOW, reply, seedBooking, send } from "./helpers";

const hourOptions = (body: Awaited<ReturnType<typeof reply>>, customId: string) =>
  allComponents(body)
    .find((c) => c.custom_id === customId)
    .options.map((o: { value: string; label: string }) => [o.value, o.label]);

describe("/book", () => {
  it("opens a private flow that offers today and the next seven days", async () => {
    const body = await reply(await send(command("book"), { now: NOW }));

    expect(body.type).toBe(4);
    expect(body.data?.flags).toBe(64);
    const dates = allComponents(body).find((c) => c.custom_id === "book:date");
    expect(dates.type).toBe(3);
    expect(dates.options.map((o: { value: string; label: string }) => [o.value, o.label])).toEqual([
      ["2026-11-18", "November 18"],
      ["2026-11-19", "November 19"],
      ["2026-11-20", "November 20"],
      ["2026-11-21", "November 21"],
      ["2026-11-22", "November 22"],
      ["2026-11-23", "November 23"],
      ["2026-11-24", "November 24"],
      ["2026-11-25", "November 25"],
    ]);
  });

  it("after picking a future day, asks for a start hour from 6 AM to 11 PM by updating the same message", async () => {
    const body = await reply(await send(componentClick("book:date", { values: ["2026-11-19"] }), { now: NOW }));

    expect(body.type).toBe(7);
    const hours = hourOptions(body, "book:sh:2026-11-19");
    expect(hours).toHaveLength(18);
    expect(hours[0]).toEqual(["06", "6 AM"]);
    expect(hours[6]).toEqual(["12", "12 PM"]);
    expect(hours.at(-1)).toEqual(["23", "11 PM"]);
  });

  it("after picking a start hour, shows the four minutes of that hour with taken ones disabled", async () => {
    await seedBooking({ userId: "7", date: "2026-11-19", start: "08:30", end: "09:30" });

    const body = await reply(await send(componentClick("book:sh:2026-11-19", { values: ["09"] }), { now: NOW }));

    expect(body.type).toBe(7);
    const buttons = allComponents(body).filter((c) => c.custom_id?.startsWith("book:sm:"));
    expect(buttons.map((b) => [b.custom_id, b.label, b.disabled ?? false])).toEqual([
      ["book:sm:2026-11-19:0900", ":00", true],
      ["book:sm:2026-11-19:0915", ":15", true],
      ["book:sm:2026-11-19:0930", ":30", false],
      ["book:sm:2026-11-19:0945", ":45", false],
    ]);
    expect(allComponents(body).some((c) => c.custom_id === "book:sh:2026-11-19")).toBe(true);
  });

  it("after picking a start minute, asks for the end hour, stopping at the next Booking", async () => {
    await seedBooking({ userId: "7", date: "2026-11-19", start: "11:00", end: "12:00" });

    const body = await reply(await send(componentClick("book:sm:2026-11-19:0930"), { now: NOW }));

    expect(body.type).toBe(7);
    expect(hourOptions(body, "book:eh:2026-11-19:0930")).toEqual([
      ["09", "9 AM"],
      ["10", "10 AM"],
      ["11", "11 AM"],
    ]);
  });

  it("after picking an end hour, shows end minutes greyed out when not after the start or past the next Booking", async () => {
    await seedBooking({ userId: "7", date: "2026-11-19", start: "11:00", end: "12:00" });
    const minutes = async (hour: string) => {
      const body = await reply(await send(componentClick("book:eh:2026-11-19:0930", { values: [hour] }), { now: NOW }));
      return allComponents(body)
        .filter((c) => c.custom_id?.startsWith("book:em:"))
        .map((b) => [b.custom_id.split(":").at(-1), b.disabled ?? false]);
    };

    expect(await minutes("09")).toEqual([["0900", true], ["0915", true], ["0930", true], ["0945", false]]);
    expect(await minutes("10")).toEqual([["1000", false], ["1015", false], ["1030", false], ["1045", false]]);
    expect(await minutes("11")).toEqual([["1100", false], ["1115", true], ["1130", true], ["1145", true]]);
  });

  it("only allows :00 when the end hour is midnight", async () => {
    const body = await reply(await send(componentClick("book:eh:2026-11-19:2200", { values: ["24"] }), { now: NOW }));

    expect(allComponents(body).filter((c) => c.custom_id?.startsWith("book:em:")).map((b) => [b.custom_id.split(":").at(-1), b.disabled ?? false])).toEqual([
      ["2400", false],
      ["2415", true],
      ["2430", true],
      ["2445", true],
    ]);
  });

  it("after picking an end minute, opens a modal asking for a reason, whether others can come in, and a note", async () => {
    const body = await reply(await send(componentClick("book:em:2026-11-19:0930:1045"), { now: NOW }));

    expect(body.type).toBe(9);
    expect(body.data?.custom_id).toBe("book:modal:2026-11-19:0930:1045");
    expect(body.data?.title).toBe("Book the Office");
    const labels = (body.data?.components ?? []).map((c: any) => [c.type, c.label, c.component.type, c.component.custom_id]);
    expect(labels).toEqual([
      [18, "Reason", 21, "reason"],
      [18, "Can others come in (quietly)?", 21, "others"],
      [18, "Note", 4, "note"],
    ]);
    const [reason, others, note] = (body.data?.components ?? []).map((c: any) => c.component);
    expect(reason.options.map((o: any) => o.label)).toEqual([
      "Work meeting",
      "Interview",
      "Study",
      "CSCU office hour",
      "Other",
    ]);
    expect(reason.required).toBe(false);
    expect(others.options.map((o: any) => o.value)).toEqual(["yes", "no"]);
    expect(note.required).toBe(false);
  });

  it("saves the Booking when the modal is submitted, announces it publicly and lists it in /bookings", async () => {
    const response = await send(
      modalSubmit("book:modal:2026-11-19:0900:1030", { reason: "work", others: "yes", note: null }),
      { now: NOW },
    );

    const body = await reply(response);
    expect(body.type).toBe(4);
    expect(body.data?.flags).toBeUndefined();
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
    expect(body.data?.content).toBe(
      "<@100> has booked the Office on November 19 from 9:00 AM to 10:30 AM for a work meeting [can come in]",
    );
    const listed = await reply(await send(command("bookings"), { now: NOW }));
    expect(listed.data?.embeds?.[0]?.description).toBe("**November 19**\n9:00 AM to 10:30 AM for <@100> [can come in]");
  });

  it.each([
    ["work", "for a work meeting"],
    ["interview", "for an interview"],
    ["study", "for studying"],
    ["office_hour", "for a cscu office hour"],
    ["other", "for some reason hmmmm"],
  ])("announces the %s reason as '%s'", async (reason, phrase) => {
    const body = await reply(
      await send(modalSubmit("book:modal:2026-11-19:1300:1400", { reason, others: "no", note: null }), { now: NOW }),
    );

    expect(body.data?.content).toBe(`<@100> has booked the Office on November 19 from 1:00 PM to 2:00 PM ${phrase}`);
  });

  it("appends the note after the reason, and shows a Booking with no reason or note plainly", async () => {
    const withNote = await reply(
      await send(modalSubmit("book:modal:2026-11-19:1300:1400", { reason: "study", others: "no", note: "SE exam" }), { now: NOW }),
    );
    const bare = await reply(
      await send(modalSubmit("book:modal:2026-11-19:1500:1600", { reason: null, others: "no", note: null }, { userId: "200" }), { now: NOW }),
    );

    expect(withNote.data?.content).toBe("<@100> has booked the Office on November 19 from 1:00 PM to 2:00 PM for studying - SE exam");
    expect(bare.data?.content).toBe("<@200> has booked the Office on November 19 from 3:00 PM to 4:00 PM");
  });

  it("books an evening that ends at midnight as 12:00 AM", async () => {
    const body = await reply(
      await send(modalSubmit("book:modal:2026-11-19:2200:2400", { reason: "study", others: "no", note: null }), { now: NOW }),
    );

    expect(body.data?.content).toBe("<@100> has booked the Office on November 19 from 10:00 PM to 12:00 AM for studying");
  });

  it("refuses a Booking that overlaps an existing one and saves nothing", async () => {
    await seedBooking({ userId: "7", date: "2026-11-19", start: "09:00", end: "10:30" });

    const response = await reply(
      await send(modalSubmit("book:modal:2026-11-19:1000:1100", { reason: "work", others: "no", note: null }), { now: NOW }),
    );

    expect(response.data?.flags).toBe(64);
    expect(response.data?.content).toContain("overlaps");
    const listed = await reply(await send(command("bookings"), { now: NOW }));
    expect(listed.data?.embeds?.[0]?.description).toBe("**November 19**\n9:00 AM to 10:30 AM for <@7>");
  });

  it("allows Bookings back to back with an existing one on either side", async () => {
    await seedBooking({ userId: "7", date: "2026-11-19", start: "09:00", end: "10:30" });
    const book = (id: string) =>
      send(modalSubmit(id, { reason: "work", others: "no", note: null }), { now: NOW }).then(reply);

    await book("book:modal:2026-11-19:1030:1130");
    await book("book:modal:2026-11-19:0800:0900");

    const listed = await reply(await send(command("bookings"), { now: NOW }));
    expect(listed.data?.embeds?.[0]?.description).toBe(
      "**November 19**\n8:00 AM to 9:00 AM for <@100>\n9:00 AM to 10:30 AM for <@7>\n10:30 AM to 11:30 AM for <@100>",
    );
  });

  it("books the Office end to end by following only the buttons and menus the bot offers", async () => {
    const now = { now: NOW };
    let body = await reply(await send(command("book", { userId: "300" }), now));
    const pick = async (customId: string, value: string) => {
      const select = allComponents(body).find((c) => c.custom_id === customId);
      expect(select, `select ${customId}`).toBeDefined();
      body = await reply(await send(componentClick(select.custom_id, { userId: "300", values: [value] }), now));
    };
    const press = async (label: string) => {
      const button = allComponents(body).find((c) => c.label === label && !c.disabled);
      expect(button, `button ${label}`).toBeDefined();
      body = await reply(await send(componentClick(button.custom_id, { userId: "300" }), now));
    };

    await pick("book:date", "2026-11-20");
    await pick("book:sh:2026-11-20", "14");
    await press(":30");
    await pick("book:eh:2026-11-20:1430", "16");
    await press(":15");
    expect(body.type).toBe(9);
    const beforeSubmit = await reply(await send(command("bookings"), now));
    expect(beforeSubmit.data?.embeds?.[0]?.description).toBe("The office is free all week!");

    const confirmation = await reply(
      await send(modalSubmit(body.data!.custom_id!, { reason: "interview", others: "yes", note: null }, { userId: "300" }), now),
    );
    expect(confirmation.data?.content).toBe(
      "<@300> has booked the Office on November 20 from 2:30 PM to 4:15 PM for an interview [can come in]",
    );
    const listed = await reply(await send(command("bookings"), now));
    expect(listed.data?.embeds?.[0]?.description).toBe("**November 20**\n2:30 PM to 4:15 PM for <@300> [can come in]");
  });

  it("lets an evening Booking end at midnight, labelled 12 AM", async () => {
    const body = await reply(await send(componentClick("book:sm:2026-11-19:2200"), { now: NOW }));

    expect(hourOptions(body, "book:eh:2026-11-19:2200").at(-1)).toEqual(["24", "12 AM (midnight)"]);
  });

  it("after picking today, only offers hours from the current one (12:01 PM -> 12 PM)", async () => {
    const body = await reply(await send(componentClick("book:date", { values: ["2026-11-18"] }), { now: NOW }));

    expect(hourOptions(body, "book:sh:2026-11-18")[0]).toEqual(["12", "12 PM"]);
  });
});
