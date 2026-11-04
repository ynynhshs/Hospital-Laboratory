
// Load environment variables.
require('dotenv').config();

// Import the Express application.


// Import the MongoDB connection function.
const connectDB = require('./config/database');

// Get the server port.
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

// Start the application only after MongoDB connects.
const startServer = async () => {
        try {
        await connectDB();

        // Import Express only after MongoDB connects.
        const app = require('./app');

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('==========================================');
            console.log(' MediLink Laboratory Backend');
            console.log('==========================================');
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Server Bind Address: 0.0.0.0:${PORT}`);
            console.log('Health Check Path: /api/v1/health');
            console.log('Server Status: Running');
            console.log('==========================================');
        });

        server.on('error', (error) => {
            console.error('Backend server error:', error.message);
            process.exit(1);
        });

    } catch (error) {
        console.error('MediLink startup failed:', error.message);
        process.exit(1);
    }
};

startServer();
