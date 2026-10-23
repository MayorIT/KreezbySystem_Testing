@echo off
cd /d "%~dp0"
echo Running data reset DRY RUN (nothing is changed)...
node scripts\reset-data.js > reset-dryrun-output.txt 2>&1
type reset-dryrun-output.txt
echo.
echo Output saved to reset-dryrun-output.txt
pause
