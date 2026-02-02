
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('mini_hr_360', 'root', 'Nikhil-700', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
});

async function diag() {
    try {
        const [businesses] = await sequelize.query("SELECT id, name FROM businesses");
        console.log('Businesses:', JSON.stringify(businesses, null, 2));

        const [users] = await sequelize.query("SELECT id, firstName, businessId FROM users");
        console.log('Users:', JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Diag Error:', err.message);
        process.exit(1);
    }
}

diag();
