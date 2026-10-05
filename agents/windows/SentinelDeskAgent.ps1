param(
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl,

    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [switch]$Once,

    [switch]$EnableAudit,

    [int]$PollSeconds = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$stateDirectory = Join-Path $env:ProgramData 'SentinelDesk'
$statePath = Join-Path $stateDirectory 'collector-state.json'

if (-not (Test-Path $stateDirectory)) {
    New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
}

function Enable-SentinelDeskAudit {
    Write-Host 'Enabling Windows audit sources used by SentinelDesk...'

    & auditpol.exe /set /subcategory:'Logon' /failure:enable | Out-Null
    & auditpol.exe /set /subcategory:'Process Creation' /success:enable | Out-Null

    $auditPath = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\System\Audit'
    if (-not (Test-Path $auditPath)) {
        New-Item -Path $auditPath -Force | Out-Null
    }
    New-ItemProperty -Path $auditPath -Name ProcessCreationIncludeCmdLine_Enabled -PropertyType DWord -Value 1 -Force | Out-Null

    $scriptBlockPath = 'HKLM:\Software\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging'
    if (-not (Test-Path $scriptBlockPath)) {
        New-Item -Path $scriptBlockPath -Force | Out-Null
    }
    New-ItemProperty -Path $scriptBlockPath -Name EnableScriptBlockLogging -PropertyType DWord -Value 1 -Force | Out-Null

    Write-Host 'Audit logging enabled. New 4625, 4688 and 4104 events can now be collected.'
}

function Read-State {
    if (-not (Test-Path $statePath)) {
        return @{
            Security = 0
            PowerShell = 0
        }
    }

    try {
        $state = Get-Content $statePath -Raw | ConvertFrom-Json
        return @{
            Security = [long]$state.Security
            PowerShell = [long]$state.PowerShell
        }
    }
    catch {
        return @{
            Security = 0
            PowerShell = 0
        }
    }
}

function Save-State([hashtable]$State) {
    $State | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8
}

function Get-EventData($Event) {
    $values = @{}
    try {
        [xml]$xml = $Event.ToXml()
        foreach ($node in $xml.Event.EventData.Data) {
            $name = [string]$node.Name
            if ($name) {
                $values[$name] = [string]$node.'#text'
            }
        }
    }
    catch {}
    return $values
}

function Get-SecurityEvents([long]$AfterRecordId) {
    $events = @()

    try {
        $raw = Get-WinEvent -FilterHashtable @{
            LogName = 'Security'
            Id = 4625, 4688
            StartTime = (Get-Date).AddHours(-24)
        } -ErrorAction Stop | Where-Object { $_.RecordId -gt $AfterRecordId } | Sort-Object RecordId

        foreach ($event in $raw) {
            $data = Get-EventData $event

            if ($event.Id -eq 4625) {
                $events += @{
                    eventId = 4625
                    logName = 'Security'
                    recordId = [long]$event.RecordId
                    provider = $event.ProviderName
                    level = $event.LevelDisplayName
                    occurredAt = $event.TimeCreated.ToUniversalTime().ToString('o')
                    sourceIp = $data['IpAddress']
                    userName = $data['TargetUserName']
                    commandLine = $null
                    message = "Failure reason: $($data['FailureReason']); Logon type: $($data['LogonType'])"
                }
            }
            elseif ($event.Id -eq 4688) {
                $events += @{
                    eventId = 4688
                    logName = 'Security'
                    recordId = [long]$event.RecordId
                    provider = $event.ProviderName
                    level = $event.LevelDisplayName
                    occurredAt = $event.TimeCreated.ToUniversalTime().ToString('o')
                    sourceIp = '127.0.0.1'
                    userName = $data['SubjectUserName']
                    commandLine = "$($data['NewProcessName']) $($data['CommandLine'])".Trim()
                    message = "Parent process: $($data['ParentProcessName'])"
                }
            }
        }
    }
    catch {
        Write-Warning "Unable to read Security log: $($_.Exception.Message)"
    }

    return $events
}

function Get-PowerShellEvents([long]$AfterRecordId) {
    $events = @()

    try {
        $raw = Get-WinEvent -FilterHashtable @{
            LogName = 'Microsoft-Windows-PowerShell/Operational'
            Id = 4104
            StartTime = (Get-Date).AddHours(-24)
        } -ErrorAction Stop | Where-Object { $_.RecordId -gt $AfterRecordId } | Sort-Object RecordId

        foreach ($event in $raw) {
            $text = [string]$event.Message
            if ($text.Length -gt 2000) {
                $text = $text.Substring(0, 2000)
            }

            $events += @{
                eventId = 4104
                logName = 'Microsoft-Windows-PowerShell/Operational'
                recordId = [long]$event.RecordId
                provider = $event.ProviderName
                level = $event.LevelDisplayName
                occurredAt = $event.TimeCreated.ToUniversalTime().ToString('o')
                sourceIp = '127.0.0.1'
                userName = $env:USERNAME
                commandLine = $null
                message = $text
            }
        }
    }
    catch {
        Write-Warning "Unable to read PowerShell Operational log: $($_.Exception.Message)"
    }

    return $events
}

function Send-Batch([array]$Events) {
    if ($Events.Count -eq 0) {
        Write-Host "$(Get-Date -Format T) - No new monitored Windows events."
        return
    }

    $body = @{
        computerName = $env:COMPUTERNAME
        events = $Events
    } | ConvertTo-Json -Depth 6

    $headers = @{
        'X-Sentinel-Key' = $ApiKey
    }

    $endpoint = "$($ApiUrl.TrimEnd('/'))/api/ingest/windows"
    $result = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json' -Body $body
    Write-Host "$(Get-Date -Format T) - Sent $($result.acceptedEvents) real Windows events; created $($result.createdIncidents) incident(s)."
}

if ($EnableAudit) {
    Enable-SentinelDeskAudit
}

do {
    $state = Read-State
    $security = @(Get-SecurityEvents -AfterRecordId $state.Security)
    $powerShell = @(Get-PowerShellEvents -AfterRecordId $state.PowerShell)
    $all = @($security + $powerShell)

    if ($all.Count -gt 0) {
        Send-Batch -Events $all

        if ($security.Count -gt 0) {
            $state.Security = ($security | Measure-Object -Property recordId -Maximum).Maximum
        }

        if ($powerShell.Count -gt 0) {
            $state.PowerShell = ($powerShell | Measure-Object -Property recordId -Maximum).Maximum
        }

        Save-State -State $state
    }
    else {
        Write-Host "$(Get-Date -Format T) - Waiting for real Windows security events..."
    }

    if (-not $Once) {
        Start-Sleep -Seconds ([Math]::Max(15, $PollSeconds))
    }
} while (-not $Once)
