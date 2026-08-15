#!/bin/sh
# Container entrypoint: migrate, seed a fresh database, then serve.
#
# `set -e` so a failed migration aborts the boot instead of starting a server
# against a half-migrated schema — Render then reports a failed deploy and
# keeps the previous instance, which is the outcome we want.
set -e

cd /app/backend

echo "==> alembic upgrade head"
alembic upgrade head

# Seed only when the database is empty.
#
# scripts/seed.py WIPES all script data before reseeding, so running it
# unconditionally on every boot would discard anything a visitor created. That
# matters here: Render's free plan spins an idle instance down and restarts it
# on the next request, which is a boot, not a deploy.
#
# On the free plan there is no persistent disk, so a *deploy* still starts from
# an empty file and this seeds it. Attach a disk mounted at /app/backend and the
# same logic preserves data across deploys with no change.
# The check prints a word rather than signalling through its exit status: a
# crashing Python process exits 1, which is indistinguishable from "not empty"
# if the status is the signal — the app would then boot with no data and no
# error. As a command substitution it is also still covered by `set -e` (a
# condition in `if` would not be), so a broken check aborts the boot.
echo "==> checking whether the database needs seeding"
needs_seed=$(python -c "
from app.database import SessionLocal
from app.models import ScriptSet
with SessionLocal() as db:
    print('yes' if db.query(ScriptSet).first() is None else 'no')
")

if [ "$needs_seed" = "yes" ]; then
  echo "==> empty database, seeding"
  python scripts/seed.py
else
  echo "==> database already has script sets, skipping seed"
fi

# `exec` so uvicorn replaces this shell as PID 1 and receives SIGTERM directly.
# Without it the shell holds PID 1, swallows the signal, and Render kills the
# container after the grace period instead of shutting down cleanly.
echo "==> starting uvicorn on :${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
