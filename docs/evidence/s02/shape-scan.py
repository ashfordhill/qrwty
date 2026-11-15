"""S02: scan files for credential shapes (no values from ~/.config; shapes only). Prints, per
pattern, the files and line numbers that match, with the match masked after 6 characters."""
import math, os, re, sys, collections

PATTERNS = {
    "private-key-block": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "aws-access-key": r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b",
    "google-api-key": r"\bAIza[0-9A-Za-z_\-]{35}\b",
    "google-oauth-client-secret": r"\bGOCSPX-[0-9A-Za-z_\-]{20,}",
    "google-sa-json": r"\"private_key(?:_id)?\"\s*:",
    "stripe-key": r"\b(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{10,}",
    "stripe-webhook-secret": r"\bwhsec_[0-9A-Za-z]{10,}",
    "github-token": r"\b(?:gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})",
    "slack-token": r"\bxox[abprs]-[0-9A-Za-z\-]{10,}",
    "anthropic-key": r"\bsk-ant-[0-9A-Za-z_\-]{10,}",
    "openai-key": r"\bsk-(?:proj-)?[0-9A-Za-z]{32,}",
    "jwt": r"\beyJ[0-9A-Za-z_\-]{8,}\.eyJ[0-9A-Za-z_\-]{8,}\.[0-9A-Za-z_\-]{8,}",
    "bearer-token": r"(?i)\bbearer\s+[0-9A-Za-z_\-\.=]{20,}",
    "url-with-password": r"\b[a-z][a-z0-9+.\-]*://[^\s/:@\"'<>]+:[^\s/@\"'<>]+@",
    "password-assignment": r"(?i)\b(?:password|passwd|secret|api[_-]?key|client[_-]?secret|token)\b\s*[\"']?\s*[:=]\s*[\"'][^\"'\s<>]{8,}[\"']",
    "cloudflare-token-assignment": r"(?i)cloudflare_api_token\s*[=:]\s*\S{20,}",
}
HEX_OR_B64 = re.compile(r"[A-Za-z0-9+/_\-]{32,}={0,2}")

def entropy(s):
    c = collections.Counter(s)
    return -sum(n / len(s) * math.log2(n / len(s)) for n in c.values())

def main():
    roots = sys.argv[1:]
    hits = collections.defaultdict(list)
    high = []
    files = 0
    for root in roots:
        for dirpath, _, names in os.walk(root):
            for name in names:
                path = os.path.join(dirpath, name)
                data = open(path, "rb").read()
                if b"\x00" in data[:4096]:
                    continue  # binary (PNG)
                files += 1
                text = data.decode("utf-8", errors="replace")
                for lineno, line in enumerate(text.splitlines(), 1):
                    for label, pat in PATTERNS.items():
                        for m in re.finditer(pat, line):
                            hits[label].append(f"{path}:{lineno}: {m.group(0)[:6]}…")
                    for m in HEX_OR_B64.finditer(line):
                        tok = m.group(0)
                        if entropy(tok) >= 4.5 and not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", tok):
                            high.append(f"{path}:{lineno}: {tok[:6]}… (len {len(tok)}, entropy {entropy(tok):.2f})")
    print(f"text files scanned: {files}")
    for label in PATTERNS:
        print(f"{label}: {len(hits[label])}")
        for h in hits[label][:20]:
            print("   ", h)
    print(f"high-entropy tokens (>=32 chars, >=4.5 bits/char, not a git/sha256 hex digest): {len(high)}")
    for h in high[:40]:
        print("   ", h)

main()
