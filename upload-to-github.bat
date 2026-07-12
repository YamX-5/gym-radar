@echo off
REM ===== Gym Radar - one-click GitHub upload =====
cd /d "%~dp0"
echo.
echo  1) First create an EMPTY repo at https://github.com/new
echo     - Name it (e.g.) gym-radar
echo     - Make it PUBLIC  (needed for free GitHub Pages)
echo     - Do NOT add a README / .gitignore / license
echo.
set /p URL="  2) Paste the repo URL here (e.g. https://github.com/you/gym-radar.git): "
echo.
git remote remove origin 2>nul
git remote add origin %URL%
git branch -M main
echo  Pushing... (a GitHub sign-in window may pop up the first time - approve it)
git push -u origin main
echo.
echo  Done. Now enable Pages: repo Settings -> Pages -> Deploy from branch -> main / root
echo.
pause
