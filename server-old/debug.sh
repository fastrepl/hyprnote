#!/bin/bash

set -e

fly ssh console --pty --select -C "/app/bin/hypr remote"
