# Matterport tour audit script

A small Node script that crawls a Matterport tour via the Matterport SDK and flags common quality issues:

- Unreachable rooms
- Missing or misaligned hotspots
- Broken transitions / dead-end sweeps
- Mislabelled scans

Internal tool we now ship to clients before signing off a tour.

## Stack

Node.js · Matterport SDK · TypeScript

## Status

🚧 Source coming. Needs Matterport API key handling extracted from our internal config before publishing.

## Featured on

https://amplifiedcreations.com/lab/matterport-tour-audit
