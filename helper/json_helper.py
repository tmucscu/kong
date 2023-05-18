import json
from helper.global_vars import *

def getJSON(key):
    with open(key, "r") as json_file:
        bookings = json.load(json_file)
    return bookings


def setJSON(key, json_file):
    with open(key, "w") as old_json:
        json.dump(json_file, old_json)


def getMembers():
    return getJSON("env/members.json")


def getMemberName(user):
    members = getMembers()
    for role in members:
        userId = str(user.id)
        if userId in members[role]:
            return members[role][userId]

    return None


def readBookings():
    return getJSON("booking/bookings.json")


def writeBookings(bookings):
    setJSON("booking/bookings.json", bookings)
