-- Check if there are any attendance records in the database
-- Run this in your MySQL client or phpMyAdmin

-- 1. Check attendance_daily_summaries table
SELECT * FROM attendance_daily_summaries ORDER BY date DESC LIMIT 10;

-- 2. Check attendance_punches table
SELECT * FROM attendance_punches ORDER BY punchAt DESC LIMIT 10;

-- 3. Check if you have any employees
SELECT id, firstName, lastName, email, businessId FROM employees LIMIT 10;

-- 4. Check for a specific employee's attendance
-- Replace 'YOUR_EMPLOYEE_ID' with an actual employee ID from step 3
SELECT * FROM attendance_daily_summaries WHERE employeeId = YOUR_EMPLOYEE_ID;

-- 5. Check attendance for current month
SELECT * FROM attendance_daily_summaries 
WHERE date >= '2026-01-01' AND date <= '2026-01-31'
ORDER BY date DESC;
