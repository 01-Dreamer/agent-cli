import * as dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config({ quiet: true });

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

export const DEFAULT_MODEL = process.env.MODEL_NAME;
