from helper.json_helper import readAnnouncements, getMemberName, getAllMemberIds


"""
Builds the shame message to send everyday
"""


def getShameMessage():
    shameMessage = "**WALL OF SHAME**\n"
    announces = readAnnouncements()
    names = set()
    empty = True
    for messageId in announces:
        if (announces[messageId]["enabled"]):
            shameMessage += announces[messageId]["url"] + "\n```"
            allMemberIds = getAllMemberIds()

            for memberId in allMemberIds:
                if memberId not in announces[messageId]["reacts"]:
                    names.add(getMemberName(memberId))
                    empty = False

            for member in sorted(list(names)):
                shameMessage += member + ", "

            names = set()
            shameMessage = shameMessage[:-2] + "```\n"
    if (empty):
        return ""

    return shameMessage
