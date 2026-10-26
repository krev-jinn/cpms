@echo off
title CPMS Automated Testing Runner
cls
echo ============================================================
echo   COURT PROCEEDINGS MANAGEMENT SYSTEM (CPMS)
echo   Automated Software Testing Suite (Assessment 8.1)
echo ============================================================
echo.
echo Choose which automated test to show your teacher:
echo.
echo   [1] Fast Backend REST API Tests (Pytest - 1.5 seconds)
echo   [2] Live Visual Browser Automation Test (Chrome opens and runs on screen)
echo   [3] Run Full Headless Suite (Pytest + Selenium)
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" (
    echo.
    echo Running Pytest API Test Suite...
    python -m pytest tests/test_api_module.py -v
    goto end
)
if "%choice%"=="2" (
    echo.
    echo Launching Live Visual Browser Test...
    echo (Keep your hands off the keyboard and let Chrome do the work!)
    python tests/demo_visible_testing.py
    goto end
)
if "%choice%"=="3" (
    echo.
    echo Running All Automated Suites...
    python -m pytest tests/ -v
    goto end
)

:end
echo.
echo ============================================================
echo Testing complete!
echo ============================================================
pause
