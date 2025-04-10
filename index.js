
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import express from 'express';

dotenv.config(); // To load environment variables from a .env file

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Discord bot is running!'));
app.listen(port, () => console.log(`Server is listening on port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function fetchHuggingFaceResponse(message) {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: message,
            }),
        });

        if (!response.ok) {
            throw new Error(`Hugging Face API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Response from Hugging Face API:', data);
        return data;
    } catch (error) {
        console.error('Error fetching from Hugging Face API:', error);
        throw error; // Rethrow the error for handling in the calling function
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userMessage = message.content.trim();
    
    try {
        const response = await fetchHuggingFaceResponse(userMessage);
        const botReply = response[0]?.generated_text || 'Sorry, I could not process your request.';

        message.reply({
            content: botReply,
        });
    } catch (error) {
        console.error(error);
        message.reply({
            content: 'Sorry, there was an error processing your request.',
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
});

client.login(process.env.DISCORD_TOKEN);

const commands = [
  {
    name: 'create',
    description: 'Creates a new short URL',
  },
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
