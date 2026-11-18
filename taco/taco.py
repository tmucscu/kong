from helper.json_helper import readTacos, writeTacos

async def giveTaco(giver, reciever, reason, date):
    tacos = readTacos()
    reciever = reciever.upper()
    if reciever in tacos:
        tacos[reciever].insert(0, {"giver": giver, "reason": reason, "date":date})
    else:
        tacos[reciever] = [{"giver": giver, "reason": reason, "date":date}]
    
    writeTacos(tacos)
    

async def getTacos():
    tacos = readTacos()
    sortedTacos = sorted(tacos, key=lambda k: len(tacos[k]), reverse=True)
    message = "# 🌮 TACOS\n"

    for i in range(len(sortedTacos)):
        if i == 0:
            message += "## 🥇 "
        elif i == 1:
            message += "## 🥈 "

        elif i == 2:
            message += "## 🥉 "
        else:
            if i == 3:
                message += "=====\n"
            if i + 1 <= 9:
                message += "0"
            message += str(i + 1) + ". "
        message += sortedTacos[i] + " - " + str(len(tacos[sortedTacos[i]])) + "\n"

    return message
        
async def getUserTacos(name):
    tacos = readTacos()
    name = name.upper()
    message = "## " + name + " TACOS\n"
    if name not in tacos:
        return name + " has NO tacos"
    
    for taco in tacos[name]:
        message += "```" + taco["date"] + ": " + taco["reason"] + " from " + taco["giver"] + "```"
    
    return message

async def resetTacos():
    writeTacos({})
    return "🌮 Taco data has been reset!"