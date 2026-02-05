// Quick diagnostic to check salary structure data
import mysql from 'mysql2/promise';

async function checkData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Nikhil-700',
    database: 'mini_hr_360'
  });
  
  console.log('Connected to database');
  
  // Get salary structures
  const [structures] = await conn.query('SELECT * FROM salary_structures LIMIT 5');
  console.log('\n=== Salary Structures ===');
  structures.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}`);
    console.log('Components type:', typeof s.components);
    console.log('Components raw:', s.components);
    try {
      const parsed = typeof s.components === 'string' ? JSON.parse(s.components) : s.components;
      console.log('Components parsed:', JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log('Parse error:', e.message);
    }
    console.log('---');
  });
  
  // Get employee salary assignments
  const [assignments] = await conn.query('SELECT * FROM employee_salary_assignments LIMIT 10');
  console.log('\n=== Employee Salary Assignments ===');
  console.log(`Total assignments: ${assignments.length}`);
  assignments.forEach(a => {
    console.log(`Assignment ID: ${a.id}, EmployeeID: ${a.employeeId}, StructureID: ${a.salaryStructureId}`);
  });
  
  await conn.end();
}

checkData().catch(e => console.error(e));
