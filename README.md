# npm-verify-guard

Global CLI to verify npm dependencies for known vulnerabilities, supply-chain news, and suspicious code patterns in `node_modules`.

Built with minimal dependencies (`fast-xml-parser` for RSS). ML layers use pure JavaScript math; ONNX models are optional.

## ML triage layers

| Layer | Method | When it runs |
|-------|--------|--------------|
| 1 | Regex + SHA-256 blacklist | Every scan |
| 2 | TF-IDF + Naive Bayes (code) / MLP (news) | Every scan |
| 3 | ONNX (CodeBERT / DistilBERT) or MLP fallback | `--deep` (daemon/scheduler) |

Fallback chain: if ONNX runtime or models are unavailable, Layer 3 automatically uses the bundled MLP weights.

```bash
# Fast path (npm install postinstall): Layers 1 + 2
npm-verify check --blocking

# Deep path (hourly daemon/scheduler): Layers 1 + 2 + 3
npm-verify check --deep

# Optional ONNX models
npm-verify models status
npm-verify models download
```

## Features

- **Local scan**: heuristic detection of `eval`, `Function`, base64 payloads, env exfiltration, suspicious lifecycle scripts, and known malware hashes
- **External scan**: OSV API vulnerability lookup and RSS security news correlation
- **Install blocking**: `postinstall` hook runs verification and fails `npm install` on threats
- **Runtime gate**: `prestart` / `predev` / `pretest` hooks block project execution until verification passes
- **Hourly monitoring**: OS scheduler (Task Scheduler on Windows, cron on Linux/macOS) or optional Node daemon

## Requirements

- Node.js >= 18

## Install globally

```bash
cd npm-verification-packages
npm install
npm link
```

Or:

```bash
npm install -g .
```

## Quick start

### 1. Configure a project

```bash
cd /path/to/your/project
npm-verify init
npm-verify watch add .
```

This adds npm lifecycle hooks to `package.json` and creates `.npm-verify.json`.

### 2. Enable hourly checks

Preferred (OS scheduler):

```bash
npm-verify scheduler install
npm-verify scheduler status
```

Alternative (Node background process):

```bash
npm-verify daemon start
npm-verify daemon status
```

### 3. Normal workflow

Every `npm install` triggers:

```bash
npm-verify check --blocking
```

Every `npm start`, `npm run dev`, or `npm test` triggers:

```bash
npm-verify gate
```

Manual check:

```bash
npm-verify check
npm-verify report
```

## Commands

| Command | Description |
|---------|-------------|
| `npm-verify init [--force]` | Add hooks and default config to current project |
| `npm-verify check [--blocking] [--deep]` | Run local + external verification |
| `npm-verify models status\|download` | Check or download optional ONNX models |
| `npm-verify check --local-only` | Scan `node_modules` only |
| `npm-verify check --external-only` | Query OSV + RSS only |
| `npm-verify check --all-watched` | Verify all registered projects |
| `npm-verify gate` | Block execution if verification failed or is running |
| `npm-verify report` | Show last report |
| `npm-verify watch add\|remove\|list [path]` | Manage watched projects |
| `npm-verify scheduler install\|uninstall\|status` | OS hourly scheduler |
| `npm-verify daemon start\|stop\|status` | Background Node daemon |

## Exit codes

- `0` — clean
- `1` — threat detected / blocked
- `2` — configuration or runtime error

## Project config (`.npm-verify.json`)

```json
{
  "allowPackages": ["node-gyp"],
  "ignorePaths": ["**/test/**", "**/docs/**", "**/.bin/**"],
  "heuristics": { "maxFileSizeKb": 512 },
  "external": { "enabled": true },
  "blockOnMedium": false,
  "blockOnHigh": true,
  "ml": {
    "enabled": true,
    "layer2Threshold": 0.7,
    "layer3Threshold": 0.8,
    "deepScanOnInstall": false,
    "useOnnx": true
  }
}
```

## Global config

Stored in `~/.npm-verify/config.json`:

```json
{
  "watchedProjects": [],
  "intervalHours": 1,
  "notifyOnThreat": true,
  "ml": {
    "useOnnx": true
  }
}
```

## Platform notes

### Windows

Scheduler uses `schtasks`:

```bash
npm-verify scheduler install
```

### Linux / macOS

Scheduler adds a cron entry:

```bash
npm-verify scheduler install
```

Ensure `npm-verify` is available in cron PATH (global install recommended).

## Limitations

- `npm install --ignore-scripts` bypasses `postinstall` protection
- Heuristic scanning may produce false positives; use `allowPackages` to suppress known safe packages
- External scans require network access; failures degrade to local-only mode when not blocking
- ONNX models are large and downloaded on demand to `~/.npm-verify/models/`
- Layer 2 precision is lower than Layer 3; tune thresholds in `.npm-verify.json`

## Tests

```bash
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup, code standards, PR checklist, and contribution areas (heuristics, ML models, external feeds, hooks, scheduler).

Quick validation before a PR:

```bash
npm run lint
npm run format:check
npm test
```

## License

MIT
