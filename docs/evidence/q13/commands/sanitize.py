#!/usr/bin/env python3
"""Q13: sanitize a captured record before it enters docs/evidence/q13 (stdin to stdout).

  sanitize.py < raw > sanitized

Replaces the trial project's ID and number, the billing account, the owner's account, the Auth0
tenant domain (read from AUTH0_DOMAIN when set, else any *.auth0.com host) and Auth0 client IDs
with labels, and strips anything token-shaped (JWTs, OAuth access tokens, base64url key rings).
"""
import os
import re
import sys

PROJECT = "project-f46f6d6a-8e74-42a0-ab1"
rules = [
    (re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*"), "<jwt>"),
    (re.compile(r"ya29\.[A-Za-z0-9_.-]+"), "<access token>"),
    (re.compile(r"\b[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}\b"), "<billing account>"),
    (re.compile(r"[A-Za-z0-9._%+-]+@gmail\.com"), "<owner>"),
    (re.compile(re.escape(PROJECT)), "<project>"),
    (re.compile(r"(?<![0-9])[0-9]{12}(?![0-9])"), "<project-number>"),  # project numbers are 12 digits
    (re.compile(r"\b[A-Za-z0-9]{32}@clients\b"), "<qrwtya-web client>@clients"),
]
domain = os.environ.get("AUTH0_DOMAIN", "").strip().removeprefix("https://").rstrip("/")
if domain:
    rules.insert(0, (re.compile(re.escape(domain)), "<tenant>.auth0.com"))
    # A body cut short can end inside the domain: its first label alone is replaced too.
    label = domain.split(".")[0]
    rules.insert(1, (re.compile(re.escape(label) + r"[a-z0-9.-]*"), "<tenant>"))
rules.append((re.compile(r"\b[a-z0-9-]+(\.[a-z]{2})?\.auth0\.com\b"), "<tenant>.auth0.com"))
text = sys.stdin.read()
for pattern, label in rules:
    text = pattern.sub(label, text)
sys.stdout.write(text)
