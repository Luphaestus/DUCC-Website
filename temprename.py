dir = "/Users/lukan/Documents/ducc/DUCC-Website/public/images/icons/outline/"

from os import listdir
from os.path import isfile, join
import shutil

files = [f for f in listdir(dir) if isfile(join(dir, f))]

for file in files:
    if file.find("dp_") == -1: continue
    newName = file[:file[:file.find("dp_")].rfind("_")] + file[file.rfind("."):]
    shutil.move(dir+file, dir+newName)
    