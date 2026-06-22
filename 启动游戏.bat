@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════╗
echo ║   🛡️  阻止传送 - 塔防游戏  ║
echo ╚══════════════════════════════════╝
echo.

:: 1. 关闭旧的服务器进程
echo [1/4] 关闭旧服务器...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9002.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    echo    已关闭旧进程 PID:%%a
)

:: 2. 构建
echo.
echo [2/4] 构建游戏...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

:: 3. 启动服务器
echo.
echo [3/4] 启动服务器 (端口 9002)...
start "游戏服务器-9002" /min npx http-server dist -p 9002 -c-1

:: 等待服务器就绪
echo    等待服务器就绪...
:wait
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:9002/index.html 2>nul
if %errorlevel% neq 0 goto wait

:: 4. 打开浏览器
echo [4/4] 打开浏览器...
start http://localhost:9002/index.html

echo.
echo ✅ 游戏已启动！
echo    固定地址: http://localhost:9002/index.html
echo.
echo 下次直接双击本文件即可，无需改端口。
echo.
pause
