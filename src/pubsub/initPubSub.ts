import { PubSub, reportInfo } from 'node-server-engine';
import { handleSampleMessage } from './handlers';

/**
 * Initialize Pub/Sub publishers and subscribers
 * 
 * This function sets up all Pub/Sub topics (publishers) and subscriptions (subscribers)
 * needed by the service. It should be called after the HTTP server is initialized.
 */
export async function initPubSub(): Promise<void> {
  // Check if Pub/Sub is enabled via environment variable
  if (process.env.ENABLE_PUBSUB?.toLowerCase() !== 'true') {
    reportInfo('Pub/Sub disabled (ENABLE_PUBSUB not set to true)');
    return;
  }

  // Check required environment variables
  if (!process.env.PUBSUB_TOPIC || !process.env.PUBSUB_SUBSCRIPTION) {
    reportInfo('Pub/Sub configuration missing - skipping initialization');
    reportInfo('Required: PUBSUB_TOPIC and PUBSUB_SUBSCRIPTION');
    return;
  }

  reportInfo('Initializing Pub/Sub...');

  // Register publishers (topics to publish to)
  // Add a publisher for each topic you want to publish messages to
  if (process.env.PUBSUB_TOPIC) {
    PubSub.addPublisher(process.env.PUBSUB_TOPIC);
    reportInfo(`Registered publisher: ${process.env.PUBSUB_TOPIC}`);
  }

  // Register additional publishers as needed
  // PubSub.addPublisher(process.env.PUBSUB_EVENT_TOPIC);
  // PubSub.addPublisher(process.env.PUBSUB_NOTIFICATION_TOPIC);

  // Register subscribers (subscriptions to listen to)
  // Add a subscriber for each subscription you want to process messages from
  if (process.env.PUBSUB_SUBSCRIPTION) {
    PubSub.addSubscriber(
      process.env.PUBSUB_SUBSCRIPTION,
      handleSampleMessage
    );
    reportInfo(`Registered subscriber: ${process.env.PUBSUB_SUBSCRIPTION}`);
  }

  // Register additional subscribers with different handlers
  // PubSub.addSubscriber(
  //   process.env.PUBSUB_ANOTHER_SUBSCRIPTION,
  //   handleAnotherMessageType
  // );

  // Initialize all Pub/Sub connections
  await PubSub.init();

  reportInfo('Pub/Sub initialized successfully');
}
