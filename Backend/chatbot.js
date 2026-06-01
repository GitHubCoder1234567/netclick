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
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are NetClick's friendly movie recommendation AI. 
Your job is to suggest movies based on ANY user request, no matter how vague or short.
Even if the request is just one word like "funny" or "scary", give 1-3 great suggestions.
Always respond ONLY with a valid JSON object — no extra text, no markdown, no backticks.
Use this exact format:
{
  "suggestions": [
    {
      "title": "Movie Title",
      "year": "2019",
      "reason": "One sentence explaining why this matches the user request"
    }
  ],
  "message": "A short friendly sentence introducing your suggestions"
}
Only suggest well-known movies with good ratings. Return 1-3 suggestions always.`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    return {
      suggestions: [],
      message: "Sorry, I couldn't connect to the AI. Please try again."
    };
  }

  const text = data.choices[0].message.content.trim();

  // Strip any markdown backticks if present
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    return {
      suggestions: [],
      message: "I had trouble with that one. Try describing the mood or genre you want."
    };
  }
}

module.exports = { getSuggestions };