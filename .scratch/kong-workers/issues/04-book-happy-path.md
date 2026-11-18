# 04: `/book`, happy path

**What to build:** A Member runs `/book` and goes through an ephemeral flow: date select, start hour then start minute buttons, end hour then end minute buttons, then a modal with a reason (the 5 presets), "others can come in", and an optional note. The Booking is saved and a public confirmation is posted. Only the person booking can see or click the flow.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Dates offered: today plus 7 days
- [ ] Times are 15-minute steps from 6 AM; midnight is allowed as an end time; a Booking stays within one day
- [ ] Taken times cannot be chosen as start or end, and a Booking cannot overlap an existing one
- [ ] The in-progress choices live in the component IDs; nothing is saved until the modal is submitted
- [ ] The confirmation matches the old wording ("X has booked the Office on … from … to …", with "[can come in]")
- [ ] Tested for overlap and boundary cases (adjacent Bookings, ending at midnight)
