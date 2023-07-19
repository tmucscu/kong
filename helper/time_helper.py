def toReadableTime(time):
    '''Returns time from 24 hr format to 12 hr format'''
    [hour, minute] = time.split(":")
    readableHour = toReadableHour(int(hour))
    [hour, ending] = readableHour.split(" ")
    return hour + ":" + minute + " " + ending


def toReadableHour(hour):
    '''Returns hour from 24 hr format to 12 hr format'''
    ending = "AM"

    if (hour >= 12):
        if (hour > 12):
            hour -= 12
        ending = "PM"

    elif (hour == 0):
        hour += 12

    return str(hour) + " " + ending


def to24Hr(hourStr):
    '''Returns hour from 12 hr format to 24 hr format'''
    [hour, ending] = hourStr.split(" ")
    hour = int(hour)

    if (hour == 12):
        hour -= 12
    if (ending == "PM"):
        hour += 12
    if (hour < 10):
        hour = "0" + str(hour)

    return str(hour)
