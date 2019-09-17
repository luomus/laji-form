#!/bin/bash

version=$(npm version | head -n 1 | tail -n 1 |awk '{print $2}' | sed "s/[\',]//g")
vim -c "execute \"+normal! O## $version\<cr>\<cr>\<esc>k\""  -c startinsert CHANGELOG.md
git add CHANGELOG.md
