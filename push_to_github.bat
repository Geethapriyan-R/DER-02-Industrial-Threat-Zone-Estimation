@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo   Pushing DER-02_FINAL to:
echo   https://github.com/Geethapriyan-R/DER-02-Industrial-Threat-Zone-Estimation
echo ========================================================
echo.

git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/Geethapriyan-R/DER-02-Industrial-Threat-Zone-Estimation.git

echo Uploading commits...
git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCESSFULLY UPDATED YOUR GITHUB REPOSITORY!
    echo   Check it live at:
    echo   https://github.com/Geethapriyan-R/DER-02-Industrial-Threat-Zone-Estimation
    echo ========================================================
) else (
    echo.
    echo --------------------------------------------------------
    echo If GitHub asked to Sign In, please complete the browser
    echo login prompt to authorize the upload.
    echo --------------------------------------------------------
)
pause
