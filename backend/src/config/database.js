
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('MONGODB_URI is missing from the environment configuration.');
        }

        await mongoose.connect(mongoURI, {
            dbName: 'medilink_lab_dev',
            serverSelectionTimeoutMS: 10000
        });

        console.log('==========================================');
        console.log(' MongoDB Atlas Connection');
        console.log('==========================================');
        console.log('Database: medilink_lab_dev');
        console.log('Connection Status: Connected');
        console.log('==========================================');

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
};

module.exports = connectDB;
