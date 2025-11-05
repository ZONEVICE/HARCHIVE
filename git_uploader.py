import os

commands = [
    'git push origin master',
    'git push github master'
]

for cmd in commands:
    os.system(cmd)
