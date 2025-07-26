---
description: 'Last updated: July 25, 2025 / Prepared by: Fastrepl, Inc.'
---

# Product Description & System Requirements

## 1. Product Overview

Hyprnote is a privacy-first AI meeting assistant that runs fully on-device or on-premise. It captures audio, transcribes speech, summarizes meetings, and enables users to search past conversations, all without transmitting user content to the cloud.

Hyprnote is designed for professionals and organizations with strict compliance and data control requirements. It offers both individual and enterprise deployments.

## 2. Core Functionality

Hyprnote is designed to do the following:

* Record and transcribe meeting audio (locally)
* Generate summaries and action items using a local or user-configured LLM
* Organize and search through past meetings
* Export transcripts and summaries in various formats
* Run offline by default, with no cloud dependency

Optional capabilities (configurable by the user):

* Connect to custom model providers (e.g., Ollama, OpenAI) for improved summary quality
* Integrate with productivity tools (e.g., Obsidian export)

## 3. System Requirements

### **For Individual Users (Desktop App)**

* Operating System: macOS Sonoma v14.2+ (Apple Silicon)
* Storage: Minimum 4GB free disk space
* Memory: At least 16GB RAM
* Internet: Not required after download (except for optional API usage)
* Other dependencies: Microphone access, audio input permission

### **For Enterprise Deployments (Self-Hosted)**

* Deployment Model: Docker-based container
* OS Compatibility: Linux
* Minimum System Requirements:
  * CPU: 4+ cores
  * RAM: 16GB+
  * Storage: 20GB+
* Internal access to: audio capture source, user authentication (if integrated), file storage
* No outbound internet access required, unless customer opts into third-party API usage
