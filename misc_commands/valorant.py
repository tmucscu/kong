import random


async def createValorantGame(ctx):
    '''Creates a valorant lobby with the users in the call'''
    try:
        # find the voice channel
        vc = ctx.author.voice.channel
        allMembers = vc.members
        attackers = []
        defenders = []

        # only matters when odd number of users. randomize which team gets the extra person
        addToAttackers = random.choice([True, False])
        for i in range(len(allMembers)):
            chosen = random.choice(allMembers)
            allMembers.remove(chosen)
            if addToAttackers:
                attackers.append(chosen.name)
                addToAttackers = False
            else:
                defenders.append(chosen.name)
                addToAttackers = True

        # choose a map
        lobbyMap = random.choice(
            ["Bind", "Haven", "Split", "Ascent", "Icebox", "Breeze", "Fracture", "Pearl", "Lotus"])

        # build output message
        lobby = "**Valorant Custom Lobby**\nMap: " + lobbyMap + "\nAttackers: "

        for member in attackers:
            lobby += member + ", "
        lobby = lobby[:-2] + "\nDefenders: "
        for member in defenders:
            lobby += member + ", "
        lobby = lobby[:-2]

        await ctx.send(lobby)
    except:
        await ctx.send("Please join a call")
