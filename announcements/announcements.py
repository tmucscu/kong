from helper.json_helper import readAnnouncements, getMemberName


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
            for memberId in announces[messageId]["toReact"]:
                names.add(getMemberName(memberId))
                empty = False

            for member in sorted(list(names)):
                shameMessage += member + ", "

            names = set()
            shameMessage = shameMessage[:-2] + "```\n"
    if (empty):
        return ""

    return shameMessage
