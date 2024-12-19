#!/bin/sh

# configure node for distributed erlang with IPV6 support
export ERL_AFLAGS="-proto_dist inet6_tcp"
export ECTO_IPV6="true"
export DNS_CLUSTER_QUERY="${FLY_APP_NAME}.internal"
export RELEASE_DISTRIBUTION="name"
export RELEASE_NODE="${FLY_APP_NAME}-${FLY_IMAGE_REF##*-}@${FLY_PRIVATE_IP}"

# Uncomment to send crash dumps to stderr
# This can be useful for debugging, but may log sensitive information
# export ERL_CRASH_DUMP=/dev/stderr
# export ERL_CRASH_DUMP_BYTES=4096
