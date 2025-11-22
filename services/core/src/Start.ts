import {server} from './Server';
import { logger } from '@shared';
import { natsClient } from './lib/nats';


// Initialize NATS connection
async function initializeServices() {
    try {
        // Connect to NATS for ML service communication
        await natsClient.connect(process.env.NATS_URL);
        logger.info('NATS client connected successfully');
    } catch (error) {
        logger.error('Failed to connect to NATS:', error);
        logger.warn('Continuing without NATS - ML features will be unavailable');
        // Don't crash - app can work without ML features
    }
}

// Start the server
const port = Number(process.env.PORT || 3000);

server.listen(port, async () => {
    logger.info('Express server started on port: ' + port);

    // Initialize services after server starts
    await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await natsClient.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await natsClient.disconnect();
    process.exit(0);
});

export default server;
