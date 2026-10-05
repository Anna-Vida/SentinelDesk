# SentinelDesk Windows Collector

This collector sends **real Windows event-log records** to SentinelDesk.

Monitored sources:

- Security Event ID **4625** — failed logon
- Security Event ID **4688** — process creation
- Microsoft-Windows-PowerShell/Operational Event ID **4104** — PowerShell script-block logging

The collector keeps local record IDs in `%ProgramData%\SentinelDesk\collector-state.json` so it does not resend the same Windows events on every polling cycle.

## Requirements

Run PowerShell **as Administrator** so the collector can read the Windows Security log.

The `-EnableAudit` option enables the Windows auditing required for the monitored event IDs. It changes local Windows audit/logging configuration, so use it intentionally.

## First live test

SentinelDesk's Admin **Windows Agent** page provides the API URL and ingestion key. Download this script and run:

```powershell
.\SentinelDeskAgent.ps1 -ApiUrl "YOUR_API_URL" -ApiKey "YOUR_KEY" -EnableAudit
```

Leave the collector running while you generate normal Windows activity. New events are stored in SentinelDesk and broadcast through SignalR.

## Detection behavior

SentinelDesk currently creates incidents automatically when:

- five or more failed logons from the same source arrive in one collector batch,
- PowerShell 4104 content matches high-risk command patterns,
- process creation 4688 command lines match high-risk execution patterns.

Other collected events are still stored as Security Events for investigation.
