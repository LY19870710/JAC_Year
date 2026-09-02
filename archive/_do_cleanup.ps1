# 移动调试脚本
Move-Item -Path "E:\Claw\JAC_Year\_check_authors.js" -Destination "E:\Claw\JAC_Year\scripts\debug\" -Force
Move-Item -Path "E:\Claw\JAC_Year\_check_citation.js" -Destination "E:\Claw\JAC_Year\scripts\debug\" -Force
Move-Item -Path "E:\Claw\JAC_Year\_test_citation_format.js" -Destination "E:\Claw\JAC_Year\scripts\debug\" -Force
Move-Item -Path "E:\Claw\JAC_Year\_regenerate.ps1" -Destination "E:\Claw\JAC_Year\scripts\debug\" -Force
Move-Item -Path "E:\Claw\JAC_Year\_regenerate_citations.bat" -Destination "E:\Claw\JAC_Year\scripts\debug\" -Force

# 移动数据库备份
Move-Item -Path "E:\Claw\JAC_Year\jac_articles.db.backup_20260506_093814" -Destination "E:\Claw\JAC_Year\archive\" -Force
Move-Item -Path "E:\Claw\JAC_Year\jac_articles.db.backup_20260506_093920" -Destination "E:\Claw\JAC_Year\archive\" -Force

# 删除冗余启动脚本
Remove-Item -Path "E:\Claw\JAC_Year\start.bat" -Force
Remove-Item -Path "E:\Claw\JAC_Year\start.sh" -Force
Remove-Item -Path "E:\Claw\JAC_Year\启动.bat" -Force
Remove-Item -Path "E:\Claw\JAC_Year\一键启动_调试.bat" -Force
Remove-Item -Path "E:\Claw\JAC_Year\诊断.bat" -Force

# 删除冗余编译脚本
Remove-Item -Path "E:\Claw\JAC_Year\build.bat" -Force
Remove-Item -Path "E:\Claw\JAC_Year\compile.bat" -Force
Remove-Item -Path "E:\Claw\JAC_Year\rebuild.bat" -Force

# 移动编译脚本到 scripts/
Move-Item -Path "E:\Claw\JAC_Year\build.cmd" -Destination "E:\Claw\JAC_Year\scripts\" -Force
Move-Item -Path "E:\Claw\JAC_Year\compile.ps1" -Destination "E:\Claw\JAC_Year\scripts\" -Force
Move-Item -Path "E:\Claw\JAC_Year\restart.bat" -Destination "E:\Claw\JAC_Year\scripts\" -Force

Write-Host "清理完成!" -ForegroundColor Green
