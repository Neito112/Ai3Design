@echo off
chcp 65001 >nul
title Auto Git Push Tool
echo ---------------------------------------------------
echo      KIEM TRA TRANG THAI CODE
echo ---------------------------------------------------

:: 1. Kiem tra xem co file nao thay doi khong
:: Lenh nay se tim kiem bat ky thay doi nao, neu khong co gi no se tra ve errorlevel khac 0
git status --porcelain | findstr . >nul

if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Khong co file nao thay doi so voi lan truoc.
    echo => Huy bo qua trinh Push.
    echo.
    goto End
)

:: 2. Neu co thay doi, thuc hien Push
echo.
echo [PHAT HIEN THAY DOI] Dang tien hanh day code len Github...

:: Lay thoi gian hien tai
set "timestamp=%date% %time%"
:: Xoa khoang trang du thua o dau (neu co) trong bien time
set "timestamp=%timestamp: =%"

echo.
echo [1/3] Dang them files (git add)...
git add .

echo [2/3] Dang luu thay doi voi thoi gian: %timestamp%
git commit -m "Auto Update: %timestamp%"

echo [3/3] Dang day len server (git push)...
git push origin main

echo.
echo ---------------------------------------------------
echo           DA CAP NHAT THANH CONG!
echo ---------------------------------------------------

:End
pause