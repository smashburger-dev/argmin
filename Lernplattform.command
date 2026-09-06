#!/bin/bash
# Lernplattform-Launcher: Server starten (falls nicht laufend) und Tab oeffnen.
# Doppelklick genuegt. Der Server laeuft weiter, bis der Mac neu startet;
# danach einfach wieder doppelklicken.
PORT=8970
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://127.0.0.1:$PORT/"

if ! curl -s --max-time 2 -o /dev/null "$URL"; then
  ( cd "$DIR" && nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & )
  # kurz warten bis der Server antwortet
  for i in $(seq 1 10); do
    curl -s --max-time 1 -o /dev/null "$URL" && break
    sleep 0.5
  done
fi

open "$URL"
