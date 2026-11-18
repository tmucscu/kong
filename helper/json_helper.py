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


def getAllMemberIds():
    members = getMembers()
    allMembers = set()
    for role in members:
        for name in members[role]:
            allMembers.add(name)

    return list(allMembers)


def getDeveloperIds():
    members = getMembers()

    return list(members["Developers"])


def getMemberName(user):
    members = getMembers()
    for role in members:
        userId = str(user)
        if userId in members[role]:
            return members[role][userId]

    return None


def updateMembers(members):
    setJSON("env/members.json", members)


def readBookings():
    return getJSON("booking/bookings.json")


def writeBookings(bookings):
    setJSON("booking/bookings.json", bookings)


def readAnnouncements():
    return getJSON("announcements/announcements.json")


def writeAnnouncements(announcements):
    setJSON("announcements/announcements.json", announcements)


def readTacos():
    return getJSON("taco/tacos.json")


def writeTacos(tacos):
    setJSON("taco/tacos.json", tacos)
