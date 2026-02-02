
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        const [tables] = await sequelize.query("SHOW TABLES");
        console.log('Tables:', JSON.stringify(tables, null, 2));

        for (let tableObj of tables) {
            const tableName = Object.values(tableObj)[0];
            const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            console.log(`- ${tableName}: ${count[0].count} rows`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
