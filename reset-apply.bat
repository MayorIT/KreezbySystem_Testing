@echo off
cd /d "%~dp0"
echo This will DELETE the 9 customers and zero the admin data in the live database.
echo A backup is saved first in the backups folder.
choice /M "Continue"
if errorlevel 2 goto :eof
node scripts\reset-data.js --apply > reset-apply-output.txt 2>&1
type reset-apply-output.txt
echo.
echo Output saved to reset-apply-output.txt
pause
