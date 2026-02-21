@echo off
title Invoicefy Frontend
color 0A
echo =======================================================
echo          STARTING INVOICEFY REACT APP
echo =======================================================
cd invoicefy-frontend
echo Installing dependencies if missing...
call npm install
echo.
echo Launching React application browser on port 3000...
npm start
pause
