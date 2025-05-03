#!/bin/bash

stable_user_id=""
nightly_user_id=""
stable_version=""
nightly_version=""

if [ -d "$HOME/Library/Application Support/com.hyprnote.stable" ]; then
    if [ -f "$HOME/Library/Application Support/com.hyprnote.stable/store.json" ]; then
        stable_user_id=$(jq -r '."auth-user-id" // empty' "$HOME/Library/Application Support/com.hyprnote.stable/store.json")
    fi
fi

if [ -d "$HOME/Library/Application Support/com.hyprnote.nightly" ]; then
    if [ -f "$HOME/Library/Application Support/com.hyprnote.nightly/store.json" ]; then
        nightly_user_id=$(jq -r '."auth-user-id" // empty' "$HOME/Library/Application Support/com.hyprnote.nightly/store.json")
    fi
fi

if [ -d "/Applications/Hyprnote.app" ]; then
    stable_version=$(defaults read /Applications/Hyprnote.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null || echo "")
fi

if [ -d "/Applications/Hyprnote Nightly.app" ]; then
    nightly_version=$(defaults read "/Applications/Hyprnote Nightly.app/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo "")
fi

cat << EOF
{
    "stable": {
        "userId": "${stable_user_id}",
        "version": "${stable_version}"
    },
    "nightly": {
        "userId": "${nightly_user_id}",
        "version": "${nightly_version}"
    }
}
EOF
