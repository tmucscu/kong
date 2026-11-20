import { allComponents, command, componentClick, modalSubmit, NOW, reply, seedBooking, send } from "./helpers";

const hourOptions = (body: Awaited<ReturnType<typeof reply>>, customId: string) =>
  allComponents(body)
    .find((c) => c.custom_id === customId)
    .options.map((o: { value: string; label: string }) => [o.value, o.label]);

const bookings = async () => (await reply(await send(command("bookings"), { now: NOW }))).data?.embeds?.[0]?.description;

describe("/book Cancel", () => {
  it("replaces the message with a short note, removes every component and saves nothing", async () => {
    const body = await reply(await send(componentClick("book:cancel"), { now: NOW }));

    expect(body.type).toBe(7);
    expect(body.data?.content).toBe("Booking cancelled. Nothing was saved.");
    expect(body.data?.components).toEqual([]);
    expect(await bookings()).toBe("The office is free all week!");
  });
});

/** Drives the flow the way a person does: only through what the previous reply offered. */
async function startFlow(userId = "100") {
  const now = { now: NOW };
  let body = await reply(await send(command("book", { userId }), now));
  const find = (match: (c: any) => boolean) => allComponents(body).find(match);
  return {
    get body() {
      return body;
    },
    ids: () => allComponents(body).map((c) => c.custom_id).filter(Boolean) as string[],
    async pick(customId: string, value: string) {
      expect(find((c) => c.custom_id === customId), `select ${customId}`).toBeDefined();
      body = await reply(await send(componentClick(customId, { userId, values: [value] }), now));
    },
    async press(label: string) {
      const button = find((c) => c.label === label && !c.disabled);
      expect(button, `button ${label}`).toBeDefined();
      body = await reply(await send(componentClick(button.custom_id, { userId }), now));
    },
  };
}

describe("/book Back", () => {
  it("is offered on every step except the first, alongside Cancel", async () => {
    const flow = await startFlow();
    const screens: string[][] = [flow.ids()];
    await flow.pick("book:date", "2026-11-20");
    screens.push(flow.ids());
    await flow.pick("book:sh:2026-11-20", "14");
    screens.push(flow.ids());
    await flow.press(":30");
    screens.push(flow.ids());
    await flow.pick("book:eh:2026-11-20:1430", "16");
    screens.push(flow.ids());

    for (const ids of screens) expect(ids).toContain("book:cancel");
    expect(screens[0].some((id) => id.startsWith("book:back:"))).toBe(false);
    for (const ids of screens.slice(1)) expect(ids.some((id) => id.startsWith("book:back:"))).toBe(true);
  });

  it("from the start hour goes back to the day choice", async () => {
    const flow = await startFlow();
    await flow.pick("book:date", "2026-11-20");
    await flow.pick("book:sh:2026-11-20", "14");

    await flow.press("Back");

    expect(flow.body.type).toBe(7);
    expect(flow.ids()).toContain("book:date");
    expect(await bookings()).toBe("The office is free all week!");
  });

  it("from the end hour goes back to the start time of the same day", async () => {
    const flow = await startFlow();
    await flow.pick("book:date", "2026-11-20");
    await flow.pick("book:sh:2026-11-20", "14");
    await flow.press(":30");
    await flow.pick("book:eh:2026-11-20:1430", "16");

    await flow.press("Back");

    expect(flow.ids()).toContain("book:sh:2026-11-20");
    expect(flow.ids()).toContain("book:sm:2026-11-20:1430");
    expect(await bookings()).toBe("The office is free all week!");
  });
});

describe("/book switching the hour", () => {
  const minuteState = (flow: Awaited<ReturnType<typeof startFlow>>, prefix: string) =>
    allComponents(flow.body)
      .filter((c) => c.custom_id?.startsWith(prefix))
      .map((b) => [b.custom_id.split(":").at(-1), b.disabled ?? false]);

  it("recomputes the start minutes for the new hour instead of keeping the old ones", async () => {
    await seedBooking({ userId: "7", date: "2026-11-20", start: "09:00", end: "09:30" });
    await seedBooking({ userId: "8", date: "2026-11-20", start: "10:15", end: "10:30" });
    const flow = await startFlow();
    await flow.pick("book:date", "2026-11-20");

    await flow.pick("book:sh:2026-11-20", "09");
    expect(minuteState(flow, "book:sm:")).toEqual([["0900", true], ["0915", true], ["0930", false], ["0945", false]]);

    await flow.pick("book:sh:2026-11-20", "10");
    expect(minuteState(flow, "book:sm:")).toEqual([["1000", false], ["1015", true], ["1030", false], ["1045", false]]);
  });

  it("recomputes the end minutes for the new hour instead of keeping the old ones", async () => {
    await seedBooking({ userId: "7", date: "2026-11-20", start: "11:30", end: "12:00" });
    const flow = await startFlow();
    await flow.pick("book:date", "2026-11-20");
    await flow.pick("book:sh:2026-11-20", "10");
    await flow.press(":15");

    await flow.pick("book:eh:2026-11-20:1015", "10");
    expect(minuteState(flow, "book:em:")).toEqual([["1000", true], ["1015", true], ["1030", false], ["1045", false]]);

    await flow.pick("book:eh:2026-11-20:1015", "11");
    expect(minuteState(flow, "book:em:")).toEqual([["1100", false], ["1115", false], ["1130", false], ["1145", true]]);
  });
});

describe("/book stale flows", () => {
  const STALE = "That booking flow has expired. Run /book to start again.";

  it.each([
    ["a day in the past", "book:date", "2026-11-17"],
    ["a day more than a week away", "book:date", "2026-11-26"],
    ["something that is not a day", "book:date", "banana"],
    ["a start hour on a past day", "book:sh:2026-11-17", "10"],
    ["an end hour on a past day", "book:eh:2026-11-17:1000", "11"],
    ["a start minute on a past day", "book:sm:2026-11-17:1000", undefined],
    ["an end minute on a past day", "book:em:2026-11-17:1000:1100", undefined],
    ["a Back to a past day", "book:back:sh:2026-11-17:10", undefined],
    ["a step this version does not know", "book:teleport:2026-11-19", undefined],
    ["a half-formed id", "book", undefined],
  ])("answers privately with a helpful message for %s", async (_what, customId, value) => {
    const body = await reply(await send(componentClick(customId, { values: value ? [value] : undefined }), { now: NOW }));

    expect(body.type).toBe(4);
    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toBe(STALE);
    expect(await bookings()).toBe("The office is free all week!");
  });

  it("explains when a start minute was booked by someone else since the buttons were drawn", async () => {
    await seedBooking({ userId: "7", date: "2026-11-20", start: "14:00", end: "15:00" });

    const body = await reply(await send(componentClick("book:sm:2026-11-20:1430"), { now: NOW }));

    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toBe("Sorry, that time is no longer free. Run /book to pick another time.");
  });

  it("explains when an end minute is no longer free instead of opening the modal", async () => {
    await seedBooking({ userId: "7", date: "2026-11-20", start: "15:00", end: "16:00" });

    const body = await reply(await send(componentClick("book:em:2026-11-20:1430:1545"), { now: NOW }));

    expect(body.type).toBe(4);
    expect(body.data?.content).toBe("Sorry, that time is no longer free. Run /book to pick another time.");
  });

  it("answers a submitted modal for a past day with the expired message and saves nothing", async () => {
    const body = await reply(
      await send(modalSubmit("book:modal:2026-11-17:1000:1100", { reason: "work", others: "no", note: null }), { now: NOW }),
    );

    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toBe(STALE);
    expect(await bookings()).toBe("The office is free all week!");
  });
});

describe("/book when the time is taken before the modal is submitted", () => {
  it("tells the user, saves nothing of theirs and keeps the other Booking", async () => {
    const now = { now: NOW };
    const flow = await startFlow("300");
    await flow.pick("book:date", "2026-11-20");
    await flow.pick("book:sh:2026-11-20", "14");
    await flow.press(":00");
    await flow.pick("book:eh:2026-11-20:1400", "15");
    await flow.press(":00");
    const modalId = flow.body.data!.custom_id!;

    await send(modalSubmit(modalId, { reason: "study", others: "no", note: null }, { userId: "400" }), now);
    const late = await reply(await send(modalSubmit(modalId, { reason: "work", others: "yes", note: null }, { userId: "300" }), now));

    expect(late.type).toBe(4);
    expect(late.data?.flags).toBe(64);
    expect(late.data?.content).toBe("Sorry, that time is no longer free. Run /book to pick another time.");
    expect(await bookings()).toBe("**November 20**\n2:00 PM to 3:00 PM for <@400>");
  });
});

describe("/book today", () => {
  const at = (iso: string) => () => new Date(iso); // Toronto is UTC-5 in November
  const minutes = async (clockNow: () => Date, customId: string, hour: string) => {
    const body = await reply(await send(componentClick(customId, { values: [hour] }), { now: clockNow }));
    return allComponents(body)
      .filter((c) => c.custom_id?.startsWith("book:sm:"))
      .map((b) => [b.custom_id.split(":").at(-1), b.disabled ?? false]);
  };

  it("greys out minutes before the current quarter hour but not the current one", async () => {
    expect(await minutes(NOW, "book:sh:2026-11-18", "12")).toEqual([["1200", false], ["1215", false], ["1230", false], ["1245", false]]);
    expect(await minutes(at("2026-11-18T17:16:00Z"), "book:sh:2026-11-18", "12")).toEqual([
      ["1200", true],
      ["1215", false],
      ["1230", false],
      ["1245", false],
    ]);
  });

  it("no longer offers the day's earlier hours once they have passed", async () => {
    const body = await reply(await send(componentClick("book:date", { values: ["2026-11-18"] }), { now: at("2026-11-18T22:50:00Z") }));

    expect(hourOptions(body, "book:sh:2026-11-18")).toEqual([
      ["17", "5 PM"],
      ["18", "6 PM"],
      ["19", "7 PM"],
      ["20", "8 PM"],
      ["21", "9 PM"],
      ["22", "10 PM"],
      ["23", "11 PM"],
    ]);
  });

  it("books the current quarter hour (12:00 at 12:01) but refuses a start that has already passed", async () => {
    const book = (start: string) =>
      send(modalSubmit(`book:modal:2026-11-18:${start}:1300`, { reason: "study", others: "no", note: null }), { now: NOW }).then(reply);

    const tooLate = await book("1145");
    const ok = await book("1200");

    expect(tooLate.data?.flags).toBe(64);
    expect(ok.data?.content).toBe("<@100> has booked the Office on November 18 from 12:00 PM to 1:00 PM for studying");
    expect(await bookings()).toBe("**November 18**\n12:00 PM to 1:00 PM for <@100>");
  });
});

describe("/book belongs to the person who started it", () => {
  it("does not let someone else press another person's buttons", async () => {
    const body = await reply(
      await send(componentClick("book:date", { userId: "999", ownerId: "100", values: ["2026-11-20"] }), { now: NOW }),
    );

    expect(body.type).toBe(4);
    expect(body.data?.flags).toBe(64);
    expect(body.data?.content).toBe("This isn't your booking. Run /book to start your own.");
  });

  it("lets the person who started it carry on", async () => {
    const body = await reply(
      await send(componentClick("book:date", { userId: "100", ownerId: "100", values: ["2026-11-20"] }), { now: NOW }),
    );

    expect(body.type).toBe(7);
  });
});

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
    expect(response.data?.content).toBe("Sorry, that time is no longer free. Run /book to pick another time.");
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
