# Content Audit Report

Generated at: 2026-03-14T10:24:54.970Z
Pages checked: 303
High issues: 58
Medium issues: 11
Low issues: 0

## Rules

- Missing summary or explanation
- Long source page but very short explanation
- Important commands missing from the explanation
- Procedural pages without clear sequence language
- Summary overly overlaps with explanation
- Placeholder text or leaked key patterns

## Top Findings

- [HIGH] /automation/cron-jobs | Cron Jobs | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：openclaw cron add/edit / openclaw cron add --light-context ... / openclaw cron edit --light-context / openclaw cron runs
- [HIGH] /automation/cron-vs-heartbeat | Cron vs Heartbeat | 关键命令保留不足
  抽样关键命令 4 个，解释中缺失 4 个。示例：openclaw cron add \ / openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce / openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus / openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
- [HIGH] /automation/hooks | Hooks | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 5 个。示例：openclaw webhooks / openclaw onboard / openclaw.hooks / openclaw hooks install
- [HIGH] /automation/poll | Polls | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：openclaw message poll --channel telegram --target 123456789 \ / openclaw message poll --channel telegram --target -1001234567890:topic:42 \ / openclaw message poll --target +15555550123 \ / openclaw message poll --target 123456789@g.us \
- [HIGH] /automation/webhook | Webhooks | 关键命令保留不足
  抽样关键命令 5 个，解释中缺失 5 个。示例：openclaw webhooks gmail setup / openclaw webhooks gmail run / curl -X POST http://127.0.0.1:18789/hooks/wake \ / curl -X POST http://127.0.0.1:18789/hooks/agent \
- [HIGH] /channels/bluebubbles | BlueBubbles | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw pairing list bluebubbles / openclaw pairing approve bluebubbles <CODE> / openclaw pairing approve bluebubbles <code> / openclaw status --deep
- [HIGH] /channels/discord | Discord | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw message thread create / openclaw security audit / openclaw update / openclaw channels status --probe
- [HIGH] /channels/googlechat | Google Chat | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw-chat / openclaw pairing approve googlechat <code> / openclaw channels status --probe / openclaw logs --follow
- [HIGH] /channels/mattermost | Mattermost | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 5 个。示例：curl https://<gateway-host>/api/channels/mattermost/command / openclaw pairing list mattermost / openclaw pairing approve mattermost <CODE> / openclaw message send
- [HIGH] /channels/msteams | Microsoft Teams | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：openclaw-msteams / openclaw plugins install @openclaw/msteams / openclaw plugins install ./extensions/msteams / openclaw message poll --channel msteams --target conversation:<id> ...
- [HIGH] /channels/signal | Signal | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw pairing approve signal <CODE> / openclaw pairing approve signal <PAIRING_CODE> / openclaw doctor --fix / curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
- [HIGH] /channels/slack | Slack | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw pairing approve slack <code> / openclaw logs --follow / openclaw doctor / openclaw pairing list slack
- [HIGH] /channels/synology-chat | Synology Chat | 关键命令保留不足
  抽样关键命令 5 个，解释中缺失 4 个。示例：openclaw pairing list synology-chat / openclaw pairing approve synology-chat <CODE> / openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw" / openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
- [HIGH] /channels/telegram | Telegram | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：openclaw channels login telegram / openclaw doctor --fix / openclaw logs --follow / openclaw message poll
- [HIGH] /channels/zalo | Zalo | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw plugins install ./extensions/zalo / openclaw pairing list zalo / openclaw pairing approve zalo <CODE> / openclaw message send --channel zalo --target 123456789 --message "hi"
- [HIGH] /ci | CI Pipeline | 关键命令保留不足
  抽样关键命令 4 个，解释中缺失 4 个。示例：pnpm check # types + lint + format / pnpm test # vitest tests / pnpm check:docs # docs format + lint + broken links / pnpm release:check # validate npm pack
- [HIGH] /cli/acp | acp | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw / openclaw acp --url wss://gateway-host:18789 --token <token> / openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token / openclaw acp --session agent:main:main
- [HIGH] /cli/agent | agent | 关键命令保留不足
  抽样关键命令 5 个，解释中缺失 4 个。示例：openclaw agent --to +15555550123 --message "status update" --deliver / openclaw agent --agent ops --message "Summarize logs" / openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium / openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
- [HIGH] /cli/channels | channels | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw channels add --help / openclaw agents bindings / openclaw agents bind / openclaw agents unbind
- [HIGH] /cli/cron | cron | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw cron edit <job-id> --announce --channel telegram --to "123456789" / openclaw cron edit <job-id> --no-deliver / openclaw cron edit <job-id> --light-context / openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
- [HIGH] /cli/daemon | daemon | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw daemon ... / openclaw gateway ... / openclaw daemon status / openclaw daemon install
- [HIGH] /cli/devices | devices | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 5 个。示例：openclaw devices / openclaw devices remove <deviceId> / openclaw devices clear --yes [--pending] / openclaw devices approve [requestId] [--latest]
- [HIGH] /cli/directory | directory | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw directory / openclaw message send --target ... / openclaw directory peers list --channel slack --query "U0" / openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
- [HIGH] /cli/index | CLI Reference | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：openclaw update / openclaw voicecall / openclaw security audit / openclaw security audit --deep
- [HIGH] /cli/message | message | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 5 个。示例：openclaw message <subcommand> [flags] / openclaw message send --channel discord \ / openclaw message poll --channel discord \ / openclaw message poll --channel telegram \
- [HIGH] /cli/secrets | secrets | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw secrets / openclaw.json / openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run / openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
- [HIGH] /cli/tui | tui | 关键命令保留不足
  抽样关键命令 4 个，解释中缺失 3 个。示例：openclaw tui --url ws://127.0.0.1:18789 --token <token> / openclaw tui --session main --deliver / openclaw tui --session bugfix
- [HIGH] /concepts/models | Models CLI | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 4 个。示例：openclaw models / openclaw agent / openclaw models list / openclaw models status
- [HIGH] /concepts/session | Session Management | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 5 个。示例：openclaw security audit / openclaw sessions cleanup --dry-run --json / openclaw status / openclaw sessions --json
- [HIGH] /experiments/plans/pty-process-supervision | PTY and Process Supervision Plan | 关键命令保留不足
  抽样关键命令 6 个，解释中缺失 6 个。示例：pnpm vitest src/process/supervisor/registry.test.ts / pnpm vitest src/process/supervisor/supervisor.test.ts / pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts / pnpm vitest src/process/supervisor/adapters/child.test.ts

## Full Counts

- High: 58
- Medium: 11
- Total issues: 69

