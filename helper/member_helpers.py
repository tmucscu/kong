import json
from helper.json_helper import *

def addMember(userId, name):
    members = getMembers()
    members["Members"][userId] = name
    updateMembers(members)

def removeMember(name):
    members = getMembers()
    for member in members["Members"]:
        if members["Members"][member] == name:
            del members["Members"][member]
            break
    
    updateMembers(members)

def listMembers():
    members = getMembers()
    msg = ""
    for member in members["Members"]:
        msg += members["Members"][member] + ", "
    
    return msg[:-2]
