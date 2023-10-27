from discord.ext import commands, tasks
from discord.utils import get
import discord

from datetime import datetime
from helper.json_helper import getJSON, readAnnouncements, writeAnnouncements, getAllMemberIds
from helper.time_helper import toReadableTime
from helper.global_vars import *
from booking.booking import getCurrentBooking
from booking.bookingEmbed import BookingEmbed
from announcements.announcements import getShameMessage

from misc_commands.valorant import createValorantGame
import asyncio


# DISCORD FUNCTIONS
intents = discord.Intents.all()
client = commands.Bot(
    intents=intents, command_prefix='kong ', help_command=None)


env = getJSON("env/env.json")


async def updateStatus():
    oldBooking = None
    while True:
        currentBooking = await getCurrentBooking()
        if currentBooking is None:
            await client.change_presence(status=discord.Status.online, activity=discord.Game(name="Office is free!"))

        elif currentBooking != oldBooking:
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
    except Exception as e:
        print(e)
    asyncio.ensure_future(updateStatus())
    asyncio.ensure_future(wallOfShame())
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


@ client.event
async def on_message(message):
    await client.process_commands(message)


@ client.event
async def on_raw_reaction_add(payload):
    if (payload.emoji.name == "kongannounce"):
        try:
            announces = readAnnouncements()
        except:
            announces = {}

        messageId = str(payload.message_id)
        # message already exists - unsoft delete it
        if (messageId in announces):
            announces[messageId]["enabled"] = True
        else:
            members = getAllMemberIds()
            # get discord msg object
            channel_id = payload.channel_id
            guild = client.get_guild(payload.guild_id)
            channel = guild.get_channel(channel_id)
            discordMsg = await channel.fetch_message(messageId)

            # build announcement object
            announces[messageId] = {
                "enabled": True, "toReact": members, "url": discordMsg.jump_url}

            await discordMsg.add_reaction("✅")
            await discordMsg.add_reaction("❌")

        writeAnnouncements(announces)

    # only valid reactions to announcement is checkmark and cross
    if ((payload.emoji.name == "✅" or payload.emoji.name == "❌") and payload.user_id != env["KONG_ID"]):
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            try:
                # remove the user from users that need to react
                announces[messageId]["toReact"].remove(str(payload.user_id))
                writeAnnouncements(announces)
            except:
                print("Error adding reaction")


@ client.event
async def on_raw_reaction_remove(payload):
    if (payload.emoji.name == "kongannounce"):
        # soft delete announcement object in case user wants to re-enable
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            announces[messageId]["enabled"] = False
            writeAnnouncements(announces)

    if (payload.emoji.name == "✅" or payload.emoji.name == "❌"):
        # add user back to users that need to react if they unreact
        announces = readAnnouncements()
        messageId = str(payload.message_id)
        if (messageId in announces):
            announces[messageId]["toReact"].append(str(payload.user_id))
            writeAnnouncements(announces)

client.run(TOKEN)
