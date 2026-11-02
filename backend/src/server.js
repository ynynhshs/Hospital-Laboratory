
// Load environment variables.
require('dotenv').config();

// Import the Express application.
const app = require('./app');

// Import the MongoDB connection function.
const connectDB = require('./config/database');

// Get the server port.
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

// Start the application only after MongoDB connects.
const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, '127.0.0.1', () => {
            console.log('==========================================');
            console.log(' MediLink Laboratory Backend');
            console.log('==========================================');
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Server URL: http://127.0.0.1:${PORT}`);
            console.log(`Health Check: http://127.0.0.1:${PORT}/api/v1/health`);
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
