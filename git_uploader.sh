#!/bin/sh

commands="
git push origin master
git push github master
"

echo "$commands" | while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    $cmd
done
