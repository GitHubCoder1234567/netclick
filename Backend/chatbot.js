// backend/chatbot.js
require('dotenv').config();
const fetch = require('node-fetch');

async function getSuggestions(userPrompt, userId) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: `<s>[INST] You are a movie recommendation AI. Respond ONLY with a JSON object, no other text.
User wants: ${userPrompt}
Return this exact JSON format:
{"suggestions":[{"title":"Movie Title","year":"2019","reason":"One sentence why"}],"message":"Short intro sentence"}
Give 1-3 suggestions of well known highly rated movies. [/INST]`,
        parameters: { max_new_tokens: 400, temperature: 0.7, return_full_text: false }
      })
    }
  );

  const data = await response.json();

  try {
    const text  = Array.isArray(data) ? data[0].generated_text : data.generated_text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    return JSON.parse(match[0]);
  } catch (e) {
    return {
      suggestions: [],
      message: "I had trouble with that one. Try describing the mood or genre you want."
    };
  }
}

module.exports = { getSuggestions };