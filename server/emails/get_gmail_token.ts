import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * To use this script:
 * 1. Go to Google Cloud Console
 * 2. Create OAuth 2.0 Client ID (Type: Desktop App)
 * 3. Download the credentials and put CLIENT_ID and CLIENT_SECRET in your .env
 * 4. Run: npx tsx server/emails/get_gmail_token.ts
 */

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function getAccessToken() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file');
        process.exit(1);
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('\n1. Authorize this app by visiting this url:');
    console.log(authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('\n2. After authorizing, you will be redirected to localhost. Copy the "code" parameter from the URL and paste it here: ', async (code) => {
        rl.close();
        try {
            const { tokens } = await oAuth2Client.getToken(code);
            console.log('\n--- SUCCESS! ---');
            console.log('Add these to your .env file:');
            console.log(`GMAIL_REFRESH_TOKEN='${tokens.refresh_token}'`);
            console.log('\nFull token JSON (for reference):');
            console.log(JSON.stringify(tokens, null, 2));
        } catch (err) {
            console.error('Error retrieving access token', err);
        }
    });
}

getAccessToken();
