from datetime import datetime, timedelta
from booking.booking import Booking
from helper.json_helper import readBookings, writeBookings, getMemberName
from helper.time_helper import toReadableTime, toReadableHour, to24Hr
from booking.booking import getReadableDateString, findFutureBookingsFromUser

import discord
from discord.ui import Select, View, Button


class BookingEmbed:
    '''Booking embed class handles all the embed necessary to create a booking'''

    def __init__(self, ctx):
        self.ctx = ctx
        self.author = getMemberName(ctx.author)
        self.booking = Booking()
        self.message = None

    async def getDatePickerEmbed(self):
        '''Sends the date picker embed'''
        async def dateCallback(interaction):
            await interaction.response.defer()

        async def buttonCallback(interaction):
            if len(dateSelect.values) > 0:
                self.booking.name = self.author
                self.booking.date = dateSelect.values[0]
                # update self.booking's available start times
                await self.booking.findAvailableStartTimes()
                # get time picker embed
                await self.getTimePickerEmbed()

            await interaction.response.defer()

        embed = discord.Embed(title="Book the Office - Date",
                              description="Please select a date to book the office\n\nThis booking was requested by **" + self.author + "**", colour=discord.Colour.orange())

        now = datetime.now()
        dateOptions = []
        # populate date options (every day of the week from today)
        for i in range(8):
            tempDate = now + timedelta(days=i)
            tempDateStr = datetime.strftime(tempDate, "%m/%d/%Y")
            readableDateStr = await getReadableDateString(tempDateStr)
            dateOptions.append(discord.SelectOption(
                label=readableDateStr, value=tempDateStr))

        # make view components
        dateSelect = Select(
            placeholder="Date",
            options=dateOptions
        )
        button = Button(style=discord.ButtonStyle.green, label="Continue")

        dateSelect.callback = dateCallback
        button.callback = buttonCallback

        view = View()
        view.add_item(dateSelect)
        view.add_item(button)

        self.message = await self.ctx.send(embed=embed, view=view)

    async def getTimePickerEmbed(self):
        '''Sends the time picker embed. If object's start isn't defined, it'll send the start time picker. Otherwise the end time picker '''
        async def hourCallback(interaction):
            minuteOptions = []
            selectedHour = int(to24Hr(hourSelect.values[0]))

            # sort minutes to handle some cases where they get shuffled
            minutes = self.booking.availableTimes[selectedHour]
            minutes.sort()

            for minute in minutes:
                # update minute options when an hour is selected
                if minute == 0:
                    minute = "00"
                minuteOptions.append(discord.SelectOption(
                    label=str(minute), value=str(minute)))
            minuteSelect.options = minuteOptions

            if len(minuteSelect.values) > 0:
                minuteSelect.placeholder = minuteSelect.values[0]

            hourSelect.placeholder = hourSelect.values[0]

            await self.message.edit(embed=embed, view=view)
            await interaction.response.defer()

        async def minuteCallback(interaction):
            await interaction.response.defer()

        async def buttonCallback(interaction):
            if (len(hourSelect.values) > 0 and len(minuteSelect.values) > 0):
                hourAs24Hr = to24Hr(hourSelect.values[0])
                if int(minuteSelect.values[0]) not in self.booking.availableTimes[int(hourAs24Hr)]:
                    # occurs when user changes hour but program keeps minutes from the previously selected hour that isn't available for this hour
                    await interaction.response.send_message("That time is not available for booking...", ephemeral=True)
                    return

                if not self.booking.start:
                    # start time embed => call time picker embed again
                    startTime = hourAs24Hr+":"+minuteSelect.values[0]
                    self.booking.start = startTime
                    await self.booking.findAvailableEndTimes()
                    await self.getTimePickerEmbed()
                else:
                    # end time embed => call reason embed
                    endTime = hourAs24Hr+":"+minuteSelect.values[0]
                    self.booking.end = endTime
                    await self.getReasonEmbed()
                await interaction.response.defer()
            else:
                # pressing continue w/o having selected hour and minute
                await interaction.response.send_message("Please enter a time...", ephemeral=True)

        if not self.booking.start:
            # embed for start time
            embed = discord.Embed(title="Book the Office - Start Time",
                                  description="Please select the time you want to **start** your office booking\n\nSelect the hour in the first dropdown and minutes in the second", colour=discord.Colour.orange())
        else:
            # embed for end time
            embed = discord.Embed(title="Book the Office - End Time",
                                  description="Please select the time you want to **end** your office booking\n\nSelect the hour in the first dropdown and minutes in the second", colour=discord.Colour.orange())

        # make hour and minute select options
        hourOptions = []
        for hour in self.booking.availableTimes:
            if len(self.booking.availableTimes[hour]) > 0:
                formattedHour = toReadableHour(hour)
                hourOptions.append(
                    discord.SelectOption(label=formattedHour, value=formattedHour))

        minuteOptions = [
            discord.SelectOption(label="00", value="00"),
            discord.SelectOption(label="15", value="15"),
            discord.SelectOption(label="30", value="30"),
            discord.SelectOption(label="45", value="45"),
        ]

        hourSelect = Select(
            placeholder="Hours",
            options=hourOptions,
        )
        minuteSelect = Select(
            placeholder="Minutes",
            options=minuteOptions,
        )

        button = Button(style=discord.ButtonStyle.green,
                        label="Continue")

        hourSelect.callback = hourCallback
        minuteSelect.callback = minuteCallback
        button.callback = buttonCallback

        view = View()
        view.add_item(hourSelect)
        view.add_item(minuteSelect)
        view.add_item(button)

        await self.message.edit(embed=embed, view=view)

    async def getReasonEmbed(self):
        '''Sends the reason picker embed and saves the booking'''
        async def selectCallback(interaction):
            await interaction.response.defer()

        async def buttonCallback(interaction):
            if len(reasonSelect.values) > 0:
                # save booking
                self.booking.reason = reasonSelect.values[0]
                await self.booking.saveBookings()
                sendEmbed = discord.Embed(
                    title=await self.booking.getSuccessfulMessage(), colour=discord.Colour.orange())
                await interaction.channel.send(embed=sendEmbed)
                await self.message.delete()

            await interaction.response.defer()

        embed = discord.Embed(title="Book the Office - Description",
                              description="Please **reply** to this message with the reason you're booking the office...or don't\n\nPlease press the \"Book\" button when you're done", colour=discord.Colour.orange())

        reasonSelect = Select(
            placeholder="Reason",
            options=[discord.SelectOption(label="work meeting 🫱‍🫲", value="for a work meeting"), discord.SelectOption(label="interview 👔", value="for an interview"), discord.SelectOption(
                label="study 📚", value="for studying"), discord.SelectOption(label="cscu office hour 🏢", value="for a cscu office hour"), discord.SelectOption(label="other 🤔", value="for some reason hmmmm")],
        )

        button = Button(style=discord.ButtonStyle.green,
                        label="Book")

        button.callback = buttonCallback
        reasonSelect.callback = selectCallback

        view = View()
        view.add_item(reasonSelect)
        view.add_item(button)
        await self.message.edit(embed=embed, view=view)

    async def getDeleteEmbed(self):
        '''Sends the delete picker embed and deletes the booking'''
        async def selectCallback(interaction):
            await interaction.response.defer()

        async def buttonCallback(interaction):
            if len(bookingSelect.values) > 0:
                bookings = readBookings()
                date = bookingSelect.values[0].split(" ")[0]
                start = bookingSelect.values[0].split(" ")[1]

                for booking in bookings[date]:
                    if booking["start"] == start:
                        bookings[date].remove(booking)
                        if len(bookings[date]) == 0:
                            bookings.pop(date)
                        readableDate = await getReadableDateString(date)
                        deleteEmbed = discord.Embed(title=self.author + " has deleted the booking on " + readableDate +
                                                    " from " + booking["start"] + " to " + booking["end"], colour=discord.Colour.orange())
                        await interaction.channel.send(embed=deleteEmbed)
                        await self.message.delete()

                        writeBookings(bookings)
                        return

                await interaction.response.defer()

        embed = discord.Embed(title="Delete a Booking",
                              description="Please select the booking you want to **delete**\n\nThis booking delete was requested by **" + self.author + "**", colour=discord.Colour.orange())
        button = Button(style=discord.ButtonStyle.red,
                        label="Delete")

        bookingsFromUser = await findFutureBookingsFromUser(self.author)
        bookingOptions = []

        # create select options from user's future bookings
        for date in bookingsFromUser:
            for booking in bookingsFromUser[date]:
                readableDate = await getReadableDateString(date)
                bookingOptions.append(discord.SelectOption(
                    label=readableDate + " - " + booking["start"] + " to " + booking["end"], value=date + " " + booking["start"]))

        if len(bookingOptions) == 0:
            # when there's no bookings to delete
            embed = discord.Embed(
                title=self.author + ", you have no bookings to delete!", colour=discord.Colour.orange())
            await self.ctx.send(embed=embed)
            return

        bookingSelect = Select(
            placeholder="Bookings",
            options=bookingOptions,
        )

        button.callback = buttonCallback
        bookingSelect.callback = selectCallback

        view = View()
        view.add_item(bookingSelect)
        view.add_item(button)

        self.message = await self.ctx.send(embed=embed, view=view)

    async def getBookingsEmbed(self):
        '''Sends the delete picker embed and deletes the booking'''
        bookings = readBookings()
        now = datetime.now()
        message = ""

        for i in range(8):
            dateObj = now + timedelta(days=i)
            dateKey = datetime.strftime(dateObj, "%m/%d/%Y")
            if dateKey in bookings:
                message += "**" + await getReadableDateString(dateKey) + "**\n"
                for booking in bookings[dateKey]:
                    message += toReadableTime(booking["start"]) + " to " + \
                        toReadableTime(booking["end"]) + \
                        " for " + booking["name"] + "\n"
                message += "\n"
        embed = discord.Embed(title="Office Bookings",
                              description=message, colour=discord.Colour.orange())

        await self.ctx.send(embed=embed)
