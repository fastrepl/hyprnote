#!/bin/bash

current_script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
npx oh-my-logo "OWhisper" dawn --filled | sed -e :a -e '/./,$!d;/^\n*$/{$d;N;};/\n$/ba' > $current_script_dir/ascii.txt
