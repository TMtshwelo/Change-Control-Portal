# Simple smoke test for the demo API
# Run from the repository folder: powershell -File .\tests\api_smoke.ps1
$base = 'http://127.0.0.1:3000/api'

Write-Host "Checking GET /requests"
try{
    $list = Invoke-RestMethod "$base/requests"
    Write-Host "GET /requests returned" ($list.Count) "items"
}catch{
    Write-Host "GET failed: $_"; exit 1
}

Write-Host "Posting a test request"
$payload = @{
    requestId = "TEST-" + (Get-Date -UFormat %s)
    title = "Smoke test request"
    requestorName = "Automation"
    requestorEmail = "test@example.com"
    department = "QA"
    summary = "Smoke test"
    description = "Created by smoke test"
    priority = "Low"
    status = "Pending"
    submittedDate = (Get-Date).ToString('o')
} | ConvertTo-Json -Depth 5

try{
    $r = Invoke-RestMethod -Uri "$base/requests" -Method Post -Body $payload -ContentType 'application/json'
    Write-Host "POST created"
}catch{
    Write-Host "POST failed: $_"; exit 1
}

Write-Host "Testing filtered export (department=QA)"
$exportUrl = "$base/export?department=QA"
$out = Join-Path $PSScriptRoot 'export_test.csv'
try{
    Invoke-WebRequest -Uri $exportUrl -OutFile $out -UseBasicParsing
    Write-Host "Export saved to $out"
}catch{
    Write-Host "Export failed: $_"; exit 1
}

Write-Host "Smoke tests completed OK"