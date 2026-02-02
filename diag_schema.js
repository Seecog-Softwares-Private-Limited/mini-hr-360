
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        const [businesses] = await sequelize.query("DESCRIBE businesses");
        console.log('Businesses Columns:', businesses.map(c => c.Field).join(', '));

        const [users] = await sequelize.query("DESCRIBE users");
        console.log('Users Columns:', users.map(c => c.Field).join(', '));

        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
