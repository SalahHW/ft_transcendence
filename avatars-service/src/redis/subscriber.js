import { redisClient } from "../redis/init.js";
import { deleteAvatar } from "../controllers/avatarControllers.js";

const streamName = process.env.USERS_SERVICE_STREAM || "user:events";
const eventType = process.env.USER_DELETED_EVENT || "user.deleted";
const consumerGroup = "avatars-service";
const consumerName = "avatar-consumer";

export async function startUserEventsSubscriber() {
  try {
    // Créer le consumer group s'il n'existe pas
    try {
      await redisClient.xgroup('CREATE', streamName, consumerGroup, '0', 'MKSTREAM');
      console.log(`Consumer group ${consumerGroup} created for stream ${streamName}`);
    } catch (err) {
      if (err.message.includes('BUSYGROUP')) {
        console.log(`Consumer group ${consumerGroup} already exists`);
      } else {
        throw err;
      }
    }

    // Écouter les messages
    console.log(`Starting to listen for events on stream ${streamName}`);
    
    while (true) {
      try {
        const messages = await redisClient.xreadgroup(
          'GROUP', consumerGroup, consumerName,
          'COUNT', 1,
          'BLOCK', 5000, // 5 secondes de timeout
          'STREAMS', streamName, '>'
        );

        if (messages && messages.length > 0) {
          const [stream, streamMessages] = messages[0];
          
          for (const [messageId, fields] of streamMessages) {
            await handleMessage(messageId, fields);
          }
        }
      } catch (err) {
        console.error('Error reading from stream:', err.message);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde avant de réessayer
      }
    }
  } catch (err) {
    console.error('Failed to start user events subscriber:', err.message);
  }
}

async function handleMessage(messageId, fields) {
  try {
    // Convertir les fields en objet
    const data = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    console.log(`Handling message ${messageId} with data:`, data);

    if (data.event === eventType) {
      console.log(`✅ Event type matches: ${eventType}`);
      
      // Parser le payload JSON s'il existe
      let userId = data.userId; // Format direct
      
      if (data.payload) {
        try {
          const payload = JSON.parse(data.payload);
          userId = payload.userId;
          console.log(`📦 Parsed payload:`, payload);
        } catch (err) {
          console.error(`❌ Failed to parse payload JSON:`, err.message);
        }
      }
      
      if (userId) {
        console.log(`👤 Processing user deletion for userId: ${userId}`);
        await deleteAvatar({ params: { id: userId } }, mockReply());
        console.log(`🗑️ Avatar deletion completed for userId: ${userId}`);
      } else {
        console.log(`⚠️ Missing userId in event data`);
      }
      
      // Acquitter le message
      await redisClient.xack(streamName, consumerGroup, messageId);
      console.log(`✅ Message ${messageId} acknowledged`);
    } else {
      console.log(`ℹ️ Event type '${data.event}' doesn't match expected '${eventType}'`);
      // Acquitter quand même pour éviter que le message reste en attente
      await redisClient.xack(streamName, consumerGroup, messageId);
    }
  } catch (err) {
    console.error(`❌ Error handling message ${messageId}:`, err.message);
  }
}

function mockReply() {
  return {
    code: () => ({
      send: () => {},
    }),
  };
}
