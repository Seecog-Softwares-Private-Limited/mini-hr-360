import 'dotenv/config';
import twilio from 'twilio';

/**
 * Generic SMS Service module using Twilio.
 * This can be copied to any Node.js project.
 * Ensure .env has TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Sends an SMS message.
 * @param {string} to - The recipient's phone number.
 * @param {string} body - The message content.
 * @returns {Promise<object>} - The Twilio message response.
 */
export const sendSMS = async (to, body) => {
    try {
        const message = await client.messages.create({
            body: body,
            from: fromNumber,
            to: to
        });
        console.log(`✅ SMS sent! SID: ${message.sid}`);
        return message;
    } catch (error) {
        console.error(`❌ Error sending SMS: ${error.message}`);
        throw error;
    }
};
