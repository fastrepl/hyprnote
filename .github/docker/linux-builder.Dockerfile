# Ubuntu 22.04 base image for building Tauri AppImage with older glibc (2.35)
# This ensures compatibility with older Linux distributions.
# See: https://v2.tauri.app/distribute/appimage/
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y \
      sudo \
      git \
      git-lfs \
      ca-certificates \
      curl \
      wget \
      xz-utils \
    && rm -rf /var/lib/apt/lists/*
