
const mongoose = require('mongoose');
const getDatabaseName = require('./database-name');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error(
                'MONGODB_URI is missing from the environment configuration.'
            );
        }

        // Get the database name for the current environment.
        const databaseName = getDatabaseName();

        // Connect to MongoDB Atlas using the selected database.
        await mongoose.connect(mongoURI, {
            dbName: databaseName,
            serverSelectionTimeoutMS: 10000
        });

        console.log('==========================================');
        console.log(' MongoDB Atlas Connection');
        console.log('==========================================');
        console.log(`Database: ${databaseName}`);
        console.log('Connection Status: Connected');
        console.log('==========================================');

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
};

module.exports = connectDB;
