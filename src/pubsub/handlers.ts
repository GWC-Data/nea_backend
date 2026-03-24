import { reportDebug, reportInfo } from 'node-server-engine';

const namespace = '~~name~~:pubsub';

/**
 * Sample handler for processing incoming Pub/Sub messages
 * 
 * @param message - The message payload
 * @param attributes - Message attributes/metadata
 * @param publishedAt - When the message was published
 */
export async function handleSampleMessage(
  message: any,
  attributes: Record<string, string>,
  publishedAt: Date
): Promise<void> {
  reportDebug({
    namespace,
    message: 'Received Pub/Sub message',
    data: { message, attributes, publishedAt }
  });

  // Add your message processing logic here
  // Example: Process event, update database, trigger workflows, etc.
  
  reportInfo(`Pub/Sub message processed successfully: ${JSON.stringify(message)}`);
}

/**
 * Add additional message handlers as needed
 * Each handler should be a separate function that can be registered
 * with different subscriptions in initPubSub.ts
 */
export async function handleAnotherMessageType(
  message: any
  // attributes: Record<string, string>,
  // publishedAt: Date
): Promise<void> {
  // Handle different message types
  reportInfo(`Processing another message type: ${message.type}`);
}
