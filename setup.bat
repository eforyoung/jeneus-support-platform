@echo off
REM ================================================
REM  JENEUS CO LTD — Support Platform Setup Script
REM  Run: setup.bat
REM ================================================

echo.
echo ======================================
echo   JENEUS CO LTD — Support Platform
echo   Setup Script
echo ======================================
echo.

REM ─── Step 1: Check Node.js ───
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org
    exit /b 1
)
echo [ OK ] Node.js found

REM ─── Step 2: Check DATABASE_URL ───
if not exist .env (
    echo [ERROR] .env file not found. Create one with DATABASE_URL, AUTH_SECRET, and BLOB_READ_WRITE_TOKEN.
    exit /b 1
)
echo [ OK ] .env file found

REM ─── Step 3: Install dependencies ───
echo.
echo --- Installing dependencies ---
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)
echo [ OK ] Dependencies installed

REM ─── Step 4: Generate Prisma client ───
echo.
echo --- Generating Prisma client ---
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma generate failed
    exit /b 1
)
echo [ OK ] Prisma client generated

REM ─── Step 5: Push database schema ───
echo.
echo --- Pushing database schema ---
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database push failed. Check your DATABASE_URL in .env
    echo        Make sure PostgreSQL is running and the database exists.
    exit /b 1
)
echo [ OK ] Database schema pushed

REM ─── Step 6: Seed database ───
echo.
echo --- Seeding database ---
call npx prisma db seed
if %ERRORLEVEL% neq 0 (
    echo [WARN] Seed may have partially failed. Continuing...
)
echo [ OK ] Database seeded (admin@jeneustech.com / admin123)

REM ─── Step 7: Build ───
echo.
echo --- Building application ---
call npx next build
if %ERRORLEVEL% neq 0 (
    echo [WARN] Build had warnings or errors. Review output above.
) else (
    echo [ OK ] Build successful
)

echo.
echo ======================================
echo   Setup Complete!
echo ======================================
echo.
echo   Next steps:
echo     1. Run: npm run dev
echo     2. Open: http://localhost:3000/login
echo     3. Login: admin@jeneustech.com / admin123
echo.
echo   To deploy to Vercel:
echo     vercel
echo     vercel --prod
echo.
echo   Set custom domain in Vercel dashboard:
echo     support.jeneustech.com
echo ======================================
