
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        const [users] = await sequelize.query("DESCRIBE users");
        console.log('Columns:', users.map(c => c.Field).join(', '));
        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
