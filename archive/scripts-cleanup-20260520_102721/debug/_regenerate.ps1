$body = @{ } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/citations/generate" -Method POST -Body $body -ContentType "application/json"
