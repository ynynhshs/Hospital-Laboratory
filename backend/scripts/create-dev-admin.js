require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/core/user.model');
const { hashPassword } = require('../src/shared/utils/password');

async function createAdmin() {
    try {
        // Explicitly connect to medilink_lab_dev
        const dbName = process.env.MONGODB_DB_NAME || 'medilink_lab_dev';
        await mongoose.connect(process.env.MONGODB_URI, { dbName: dbName });
        console.log(`Connected to database: ${dbName}...`);

        const adminData = {
            employeeId: 'EMP-00001',
            firstName: 'Development',
            lastName: 'Administrator',
            username: 'admin',
            email: 'admin@medilink.com',
            passwordHash: await hashPassword('admin123'),
            role: 'lab_admin',
            status: 'Active'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin account already exists!');
            process.exit(0);
        }

        await User.create(adminData);
        console.log('✅ Admin account created successfully in medilink_lab_dev!');
        console.log('Username: admin');
        console.log('Password: admin123');
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();