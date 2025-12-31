@echo off
chcp 65001 >nul
title Tool Cap Nhat Code Tu Github
echo ---------------------------------------------------
echo      CAP NHAT CODE MOI TU GITHUB
echo ---------------------------------------------------

:: Kiem tra ket noi va lay code ve
echo [1/1] Dang tai du lieu moi nhat (git pull)...
echo.

git pull origin main

:: Kiem tra xem lenh co chay thanh cong khong
if %errorlevel% neq 0 (
    echo.
    echo ---------------------------------------------------
    echo [LOI] KHONG THE CAP NHAT!
    echo Nguyen nhan co the:
    echo 1. Mat ket noi mang.
    echo 2. Co su xung dot (Conflict) giua file tren may va tren mang.
    echo 3. Ban chua luu (commit) cac file dang sua doi tren may.
    echo ---------------------------------------------------
) else (
    echo.
    echo ---------------------------------------------------
    echo [THANH CONG] Da cap nhat code moi nhat ve may!
    echo ---------------------------------------------------
)

pause