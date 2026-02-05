input_dir = "./public/images/icons/outline/"
output_file = "./src/client/utils/icons.ts"

from os import listdir
from os.path import isfile, join
import shutil

# --- Filename Normalization ---
# Cleans up export artifacts from design tools (e.g. stripping 'dp_' suffixes)
files = [f for f in listdir(input_dir) if isfile(join(input_dir, f))]

for file in files:
    if file.find("dp_") == -1: continue
    # Derive new name by stripping resolution suffixes
    # Assumes format like name_24dp_... or name_wght...
    newName = file[:file[:file.find("dp_")].rfind("_")] + file[file.rfind("."):]
    shutil.move(join(input_dir, file), join(input_dir, newName))
    
# --- JS Module Generation ---
# Reads all SVGs, strips fill attributes, and generates 'export const NAME_SVG = ...'
files = [f for f in listdir(input_dir) if isfile(join(input_dir, f)) and f.endswith(".svg")]

icons = ""
iconNames = "{"

for file in files:
    with open(join(input_dir, file), "r") as i:
        icon=i.read()
    
    # Generate constant name (e.g. my-icon.svg -> MY_ICON_SVG)
    name = file[:file.rfind(".")].replace("-", "_").upper() + "_SVG"

    # Strip hardcoded fill attributes so icons respect currentColor or CSS fill properties
    startFill = icon.find('fill="')
    if startFill != -1:
        # Handle the second quote correctly
        endFill = icon[startFill + len('fill="'):].find('"') + startFill + len('fill="') + 1
        icon = icon[:startFill] + icon[endFill:]

    # Add to module string
    icons += "const " + name + " = `" + icon + "`\n"
    if iconNames != "{":
        iconNames += ","
    iconNames += " " + name + " "

# Finalize the export statement
icons += f"\nexport { iconNames }" + "};"

# Save the generated TS module
with open(output_file, "w") as i:
    i.write(icons)
