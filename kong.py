from discord.ext import commands, tasks
from discord.utils import get
import discord
import os
from datetime import datetime
from helper.json_helper import getJSON, readAnnouncements, writeAnnouncements, getAllMemberIds, getDeveloperIds, getMemberName
from helper.time_helper import toReadableTime
from helper.member_helpers import *
from helper.global_vars import *
from booking.booking import getCurrentBooking
from booking.bookingEmbed import BookingEmbed
from announcements.announcements import getShameMessage
from datetime import datetime
from taco.taco import giveTaco, getTacos, getUserTacos, resetTacos


from misc_commands.valorant import createValorantGame
import asyncio


# DISCORD FUNCTIONS
intents = discord.Intents.all()
client = commands.Bot(
    intents=intents, command_prefix='kong ', help_command=None)


env = getJSON("env/env.json")

acceptedEmojis = ["✅", "❌", "1️⃣", "2️⃣", "3️⃣"]


async def updateStatus():
    await client.wait_until_ready()

    oldBooking = None

    while not client.is_closed():
        currentBooking = await getCurrentBooking()

        if currentBooking is None:
            if oldBooking is not None:
                await client.change_presence(status=discord.Status.online, activity=discord.Game(name="Office is free!"))
            oldBooking = None

        elif currentBooking != oldBooking:
            print("new booking found", currentBooking)
            kongStatus = discord.Status.dnd
            kongActivity = currentBooking["name"] + \
                " until " + toReadableTime(currentBooking["end"])

            if currentBooking["canOthersCome"]:
                kongStatus = discord.Status.idle
                kongActivity += " [can come in]"

            await client.change_presence(status=kongStatus, activity=discord.Game(name=kongActivity))
            oldBooking = currentBooking

        await asyncio.sleep(10)


async def wallOfShame():
    await client.wait_until_ready()
    # post at 11 AM everyday
    postedToday = False
    while True:
        currentTime = datetime.now()
        currentHour = currentTime.hour
        if (not postedToday and currentHour == 11):
            shameMessage = getShameMessage()
            if len(shameMessage) > 0:
                await client.get_channel(env["ANNOUNCEMENT_CHANNEL"]).send(shameMessage)

            postedToday = True
        elif (currentHour < 11):
            postedToday = False
        await asyncio.sleep(900)


@ client.event
async def on_ready():
    print('Kong is logged in')
    try:
        synced = await client.tree.sync()
        print("Client synced")
        await client.change_presence(status=discord.Status.online, activity=discord.Game(name="Office is free!"))
    except Exception as e:
        print(e)

    client.loop.create_task(updateStatus())
    client.loop.create_task(wallOfShame())
# BADGE


@client.tree.command(name="badge")
async def badge(interaction: discord.Interaction):
    await interaction.response.send_message("Badge renewed", ephemeral=True)

# HELP


@client.command(name="help")
async def help(ctx):
    helpMsg = "**Book Commands**\n**kong book**: book the office\n**kong delete**: delete a booking\n**kong all**: get all bookings\n"
    embed = discord.Embed(title="Kong Help",
                          description=helpMsg, colour=discord.Colour.orange())
    await ctx.send(embed=embed)

# BOOKING


@client.command(name="book")
async def book(ctx):
    bookingEmbed = BookingEmbed(ctx)
    await bookingEmbed.getDatePickerEmbed()


@client.command(name="all")
async def all(ctx):
    bookingEmbed = BookingEmbed(ctx)
    await bookingEmbed.getBookingsEmbed()


@client.command(name="delete")
async def delete(ctx):
    bookingEmbed = BookingEmbed(ctx)
    await bookingEmbed.getDeleteEmbed()

# VALORANT


@client.command(name="valorant")
async def valorant(ctx):
    await createValorantGame(ctx)


@client.command(name="member")
async def member(ctx):
    if not str(ctx.message.author.id) == "360233756738584576":
        await ctx.send("Only the System Admin can Add and Remove members")
        return

    words = ctx.message.content.split(" ")
    if words[2] == "add":
        addMember(words[3], words[4])
        await ctx.send("Added member " + words[4] + " with ID " + words[3])

    elif words[2] == "remove":
        removeMember(words[3])
        await ctx.send("Removed member " + words[3])
    elif words[2] == "list":
        members = listMembers()
        await ctx.send("Members:\n" + members)

# TACO


@client.command(name="taco")
async def taco(ctx):
    words = ctx.message.content.split(" ")
    print(ctx.message.mentions)
    if len(words) == 2:
        # show leadboard
        await ctx.send(await getTacos())

    if len(words) == 3:
        if len(ctx.message.mentions) > 0:
            await ctx.send("Please add a reason for the taco!")
            return
        await ctx.send(await getUserTacos(words[2]))

    if len(ctx.message.mentions) >= 1:
        giverName = ctx.message.author.nick or ctx.message.author.name

        for user in ctx.message.mentions:
            name = user.nick or user.name
            if name == giverName:
                await ctx.send("You cannot give yourself a taco!")
                return

        now = datetime.now()
        date = now.strftime("%m-%d-%Y")
        message = "**" + giverName + "** gave a 🌮 to "
        # give a taco
        reason = ""
        for word in words[2:]:
            if "<@" not in word:
                reason += word + " "

        for user in ctx.message.mentions:
            name = user.nick or user.name
            if not giverName or not name or not reason or not date:
                await ctx.send("Error giving this taco. Please try again!")
                continue
            message += "**" + name + "**, "
            await giveTaco(giverName, name, reason[:-1], date)

        await ctx.send(message[:-2] + " because they " + reason + " 👏👏")

@client.command(name="tacoReset")
async def resetTacos(ctx):
    if not str(ctx.message.author.id) == "596920297731522596":
        await ctx.send("Only the System Admin can reset tacos")
        return

    message = await resetTacos()
    await ctx.send(message)

@ client.event
async def on_message(message):
    await client.process_commands(message)


@ client.event
async def on_raw_reaction_add(payload):
    developers = getDeveloperIds()
    if (payload.emoji.name == "kongannounce" and str(payload.user_id) in developers):
        try:
            announces = readAnnouncements()
        except:
            announces = {}

        messageId = str(payload.message_id)
        # message already exists - unsoft delete it
        if (messageId in announces):
            announces[messageId]["enabled"] = True
        else:
            # get discord msg object
            channel_id = payload.channel_id
            guild = client.get_guild(payload.guild_id)
            channel = guild.get_channel(channel_id)
            discordMsg = await channel.fetch_message(messageId)

            # build announcement object
            announces[messageId] = {
                "enabled": True, "reacts": {}, "url": discordMsg.jump_url}

            await discordMsg.add_reaction("✅")
            await discordMsg.add_reaction("❌")

        writeAnnouncements(announces)

    # only valid reactions to announcement is checkmark and cross
    if ((payload.emoji.name in acceptedEmojis) and payload.user_id != env["KONG_ID"]):
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            try:
                # remove the user from users that need to react
                userId = str(payload.user_id)
                if userId in announces[messageId]["reacts"]:
                    announces[messageId]["reacts"][userId] += 1
                else:
                    announces[messageId]["reacts"][userId] = 1
                writeAnnouncements(announces)
            except:
                print("Error adding reaction")


@ client.event
async def on_raw_reaction_remove(payload):
    if (payload.emoji.name == "kongannounce" and getMemberName(payload.user_id) == "Jason"):
        # soft delete announcement object in case user wants to re-enable
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            announces[messageId]["enabled"] = False
            writeAnnouncements(announces)

    if (payload.emoji.name in acceptedEmojis):
        # add user back to users that need to react if they unreact
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            reactions = announces[messageId]["reacts"]
            userId = str(payload.user_id)

            if (reactions[userId] == 1):
                del reactions[userId]
            else:
                reactions[userId] -= 1
            writeAnnouncements(announces)

client.run(TOKEN)
