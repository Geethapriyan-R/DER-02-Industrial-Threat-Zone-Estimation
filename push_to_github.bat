@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo   Push DER-02_FINAL to GitHub (Geethapriyan-R)
echo ========================================================
echo.

set /p REPO_URL="Enter your GitHub repository URL (e.g., https://github.com/Geethapriyan-R/DER-02.git): "
if "%REPO_URL%"=="" (
    echo No URL entered. Exiting.
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Pushing to %REPO_URL%...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo ========================================================
) else (
    echo.
    echo PUSH FAILED. Please verify your repository URL and GitHub credentials.
)
pause
