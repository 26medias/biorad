@echo off
cd C:\xampp\htdocs\git\biorad
node main.js -online false -timeout 120000 -threads 1 -debug_mode true -mysql true -db biorad -mailmethod file -batchsize 50 -process_emails false -race_update_interval 500
pause