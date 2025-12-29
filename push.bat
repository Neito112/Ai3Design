@echo off
chcp 65001 nul
echo ---------------------------------------------------
echo      TOOL TU DONG UP CODE LEN GITHUB
echo ---------------------------------------------------

 1. Them tat ca cac file thay doi
echo [13] Dang them files (git add)...
git add .

 2. Nhap noi dung commit
set p msg=Nhap noi dung thay doi (An Enter de dung mac dinh) 

 Neu khong nhap gi thi dung tin nhan mac dinh
if %msg%== set msg=Cap nhat code moi tu dong

echo [23] Dang luu thay doi (git commit)...
git commit -m %msg%

 3. Day len Github
echo [33] Dang day len server (git push)...
git push origin main

echo.
echo ---------------------------------------------------
echo           DA HOAN TAT!
echo ---------------------------------------------------
pause