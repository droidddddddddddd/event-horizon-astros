#!/usr/bin/env bash
# Starts a LOCAL solana-test-validator with the Metaplex Core + Core Candy Machine programs dumped from DEVNET (public, read-only).
# Needs the Solana CLI (solana, solana-test-validator). Ledger lives in a temp dir; nothing is written into the repo.
set -euo pipefail
DIR="${1:-${TMPDIR:-/tmp}/astros-local-validator}"; mkdir -p "$DIR/programs"
dump() { [ -s "$DIR/programs/$2.so" ] || solana program dump -u devnet "$1" "$DIR/programs/$2.so"; }
dump CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d mpl_core
dump CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J core_candy_machine
dump CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ core_candy_guard
exec solana-test-validator --reset --quiet --ledger "$DIR/ledger" \
  --bpf-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d "$DIR/programs/mpl_core.so" \
  --bpf-program CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J "$DIR/programs/core_candy_machine.so" \
  --bpf-program CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ "$DIR/programs/core_candy_guard.so"
