from datetime import datetime
from helper.json_helper import readBookings, writeBookings
from helper.time_helper import toReadableTime
from helper.global_vars import *


class Booking():
    '''Booking class is the booking the user builds via the embeds in BookingEmbed'''

    def __init__(self):
        self.name, self.date, self.start, self.end, self.reason, self.canOthersCome, self.availableTimes = None, None, None, None, None, None, None

    async def findAvailableStartTimes(self):
        '''Sets availableTimes to available start times'''
        async def removeBookedTime(booking: dict):
            '''Takes in a booking and removes times that are within that booking'''
            startDT = datetime.strptime(
                self.date + " " + booking["start"], "%m/%d/%Y %H:%M")
            endDT = datetime.strptime(
                self.date + " " + booking["end"], "%m/%d/%Y %H:%M")
            tempDate = datetime.strptime(self.date, "%m/%d/%Y")

            for hour in range(0, 24):
                tempDate = tempDate.replace(hour=hour)
                for minute in range(0, 60, 15):
                    tempDate = tempDate.replace(minute=minute)
                    # remove time if between booking's start and end times
                    if hour in self.availableTimes and minute in self.availableTimes[hour] and tempDate >= startDT and tempDate < endDT:
                        self.availableTimes[hour].remove(minute)

        bookings = readBookings()
        self.availableTimes = {}

        # Populate availableTimes
        now = datetime.now()
        # if booking for today
        nowDate = datetime.strftime(now, "%m/%d/%Y")
        if self.date == nowDate:
            # Populate available times w hours that are past or equal the current hour
            # don't alter minutes in case user wants to make booking right now (i.e 12:01 ==> user can book at 12:00 instead of waiting for 12:15)
            for hour in range(0, 24):
                if hour >= now.hour:
                    self.availableTimes[hour] = [0, 15, 30, 45]

        # if booking not for today
        else:
            # Populate with all times
            for hour in range(0, 24):
                self.availableTimes[hour] = [0, 15, 30, 45]

        # Remove times that are in bookings
        if self.date in bookings:
            for booking in bookings[self.date]:
                await removeBookedTime(booking)

    async def findAvailableEndTimes(self):
        '''Sets availableTimes to available end times'''
        async def findNextBooking():
            '''Finds the next booking that starts after this booking's selected start time'''
            bookings = readBookings()
            tempDT = datetime.strptime(
                self.date + " " + self.start, "%m/%d/%Y %H:%M")
            if self.date in bookings:
                for booking in bookings[self.date]:
                    bookingStart = datetime.strptime(
                        self.date + " " + booking["start"], "%m/%d/%Y %H:%M")
                    if tempDT < bookingStart:
                        return booking
            return None

        startHour = int(self.start[0:2])
        startMinute = int(self.start[3:])

        nextBooking = await findNextBooking()
        if nextBooking:
            nextStartHour = int(nextBooking["start"][0:2])
            nextStartMinute = int(nextBooking["start"][3:])
            # make the next booking's start an availablle time
            self.availableTimes[nextStartHour].append(nextStartMinute)

        for hour in self.availableTimes:
            # remove hours before the selected start or after the next booking's start
            if hour < startHour or (nextBooking and hour > nextStartHour):
                self.availableTimes[hour] = []

        for minute in range(len(self.availableTimes[startHour])):
            # remove minutes after the start's minute (i.e start = 4:30 => need to remove minutes 00, 15, 30 from hour 4)
            if self.availableTimes[startHour][minute] == startMinute:
                self.availableTimes[startHour] = self.availableTimes[startHour][minute+1:]
                break

    async def getSuccessfulMessage(self):
        '''Returns the string message for the successful booking embed'''
        readableDateStr = await getReadableDateString(self.date)
        msg = self.name + " has booked the office on " + readableDateStr + " from " + \
            toReadableTime(self.start) + " to " + \
            toReadableTime(self.end) + " " + self.reason
        if self.canOthersCome:
            msg += " [can come in]"
        return msg

    async def saveBookings(self):
        '''Saves booking to bookings json in the correct, chronological spot'''
        bookings = readBookings()
        bookingObj = {"name": self.name, "start": self.start,
                      "end": self.end, "reason": self.reason, "canOthersCome": self.canOthersCome}
        if self.date not in bookings.keys():
            bookings[self.date] = [bookingObj]
        else:
            added = False
            for i in range(len(bookings[self.date])):
                # add the new booking in the correct order now to avoid sorting later (chronological)
                bookingStart = int(
                    bookings[self.date][i]["start"].replace(":", ""))
                newBookingStart = int(bookingObj["start"].replace(":", ""))
                if newBookingStart < bookingStart:
                    # the correct spot is at index i
                    bookings[self.date].insert(i, bookingObj)
                    added = True
                    break

            if not added:
                # when the new booking is after all the previously booked bookings
                bookings[self.date].append(bookingObj)
        writeBookings(bookings)


async def getReadableDateString(dateStr):
    '''Converts ex: 05/15/2023 to May 15'''
    if dateStr:
        dateDT = datetime.strptime(dateStr, "%m/%d/%Y")
    return str(month[dateDT.month - 1]) + " " + str(dateDT.day)


async def getCurrentBooking():
    '''Returns the booking happening right now'''
    bookings = readBookings()
    now = datetime.now()
    dateStr = datetime.strftime(now, "%m/%d/%Y")
    if dateStr in bookings:
        for booking in bookings[dateStr]:
            bookingStart = datetime.strptime(
                dateStr + " " + booking["start"], "%m/%d/%Y %H:%M")
            bookingEnd = datetime.strptime(
                dateStr + " " + booking["end"], "%m/%d/%Y %H:%M")

            if bookingStart <= now <= bookingEnd:
                return booking
    return None


async def findFutureBookingsFromUser(user):
    '''Given an user, returns a dict of future bookings from that user'''
    bookings = readBookings()
    bookingsFromUser = {}
    now = datetime.now()

    for date in bookings:
        for booking in bookings[date]:
            if booking["name"] == user:
                dateObj = datetime.strptime(
                    date + " " + booking["end"], "%m/%d/%Y %H:%M")
                if dateObj > now:
                    if date in bookingsFromUser:
                        bookingsFromUser[date].append(booking)
                    else:
                        bookingsFromUser[date] = [booking]

    return bookingsFromUser
