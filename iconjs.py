dir = "/Users/lukan/Documents/ducc/DUCC-Website/public/images/icons/outline/"

from os import listdir
from os.path import isfile, join

files = [f for f in listdir(dir) if isfile(join(dir, f)) and f.endswith(".svg")]

icons = ""
iconNames = "{"

for file in files:
    with open(dir+file, "r") as i:
        icon=i.read()
    name = file[:file.rfind(".")].replace("-", "_").upper() + "_SVG"

    startFill = icon.find('fill="')
    endFill = icon[startFill:].find('"') + startFill + len('fill="')
    icon = icon[:startFill] + icon[endFill+1:]

    

    icons += "const " + name + " = `" + icon+"`\n"
    if iconNames != "{":
        iconNames += ","
    iconNames += " " + name + " "

icons += f"\nexport { iconNames }" + "};"

with open(dir+"icons.js", "w") as i:
    i.write(icons)

    