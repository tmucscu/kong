from time import strptime
from time import localtime
from discord.ext import commands, tasks
from discord.utils import get
from discord.ui import Select, View, Button
import discord
from datetime import datetime, timedelta

from helper.json_helper import readBookings, writeBookings, getMemberName
from helper.global_vars import *
from booking.booking import getCurrentBooking
from booking.bookingEmbed import BookingEmbed
from misc_commands.valorant import createValorantGame
import booking.bookingEmbed
import json
import asyncio
import random


# DISCORD FUNCTIONS
intents = discord.Intents.all()
client = commands.Bot(
    intents=intents, command_prefix='kong ', help_command=None)


async def updateStatus():
    oldBooking = None
    while True:
        currentBooking = await getCurrentBooking()
        if currentBooking is None:
            await client.change_presence(status=discord.Status.online, activity=discord.Game(name="Office is free!"))

        elif currentBooking != oldBooking:
            await client.change_presence(status=discord.Status.dnd, activity=discord.Game(name=currentBooking["name"] + " until " + currentBooking["end"]))
            oldBooking = currentBooking

        await asyncio.sleep(10)


@ client.event
async def on_ready():
    print('Kong is logged in')
    try:
        synched = await client.tree.sync()
        print("Client synced")
    except Exception as e:
        print(e)
    asyncio.ensure_future(updateStatus())

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

client.run(TOKEN)
