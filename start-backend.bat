@echo off
title Invoicefy Backend
color 0B
echo =======================================================
echo          STARTING INVOICEFY BACKEND SERVER
echo =======================================================
cd server
echo Installing dependencies if missing...
call npm install
echo.
echo Starting the development server on port 5000...
npm run dev
pause
