// backend/chatbot.js
require('dotenv').config();
const fetch = require('node-fetch');

async function getSuggestions(userPrompt, userId) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'llama3-8b-8192',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are NetClick's movie recommendation AI. When given a user's request,
you respond ONLY with a JSON object in this exact format:
{
  "suggestions": [
    {
      "title": "Movie Title",
      "year": "2023",
      "reason": "One sentence on why this matches the request",
      "tmdb_search": "search term to find this on TMDB"
    }
  ],
  "message": "A short friendly intro message (1 sentence)"
}
Return 1-3 suggestions. Only suggest films with strong critical reception.
Do not include any text outside the JSON object.`
        },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content;

  // Parse the JSON response
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      suggestions: [],
      message: "I had trouble finding the perfect match. Try being more specific!"
    };
  }
}

module.exports = { getSuggestions };