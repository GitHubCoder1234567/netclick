// backend/chatbot.js
require('dotenv').config();
const fetch = require('node-fetch');

async function getSuggestions(userPrompt, userId) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: `<s>[INST] You are a movie recommendation AI. The user wants: "${userPrompt}"

Respond with ONLY this JSON, no explanation, no markdown:
{"message":"Here are my suggestions for you:","suggestions":[{"title":"MOVIE NAME","year":"YEAR","reason":"REASON"},{"title":"MOVIE NAME","year":"YEAR","reason":"REASON"},{"title":"MOVIE NAME","year":"YEAR","reason":"REASON"}]}

Replace the values with 3 real well-known movies that match the request. [/INST]`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.5,
            return_full_text: false,
            stop: ["</s>"]
          }
        })
      }
    );

    const raw  = await response.json();
    console.log('HF raw response:', JSON.stringify(raw));

    let text = '';
    if (Array.isArray(raw))           text = raw[0]?.generated_text || '';
    else if (raw.generated_text)      text = raw.generated_text;
    else if (raw.error)               throw new Error(raw.error);

    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);

    // Validate structure
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid structure');
    }

    return parsed;

  } catch (e) {
    console.error('Chatbot error:', e.message);
    // Fallback — return hardcoded suggestions based on keywords
    return fallbackSuggestions(userPrompt);
  }
}

// Fallback if AI fails — keyword-based suggestions
function fallbackSuggestions(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes('funny') || p.includes('comedy') || p.includes('laugh')) {
    return {
      message: "Here are some great comedy picks for you:",
      suggestions: [
        { title: "The Hangover", year: "2009", reason: "A hilarious comedy about a wild Vegas bachelor party gone wrong." },
        { title: "Superbad", year: "2007", reason: "A genuinely funny coming-of-age comedy with great performances." },
        { title: "Step Brothers", year: "2008", reason: "Will Ferrell and John C. Reilly at their comedic best." }
      ]
    };
  }
  if (p.includes('action') || p.includes('fight') || p.includes('adventure')) {
    return {
      message: "Here are some high-energy action picks:",
      suggestions: [
        { title: "Mad Max: Fury Road", year: "2015", reason: "Non-stop action with stunning visuals and a 97% on Rotten Tomatoes." },
        { title: "John Wick", year: "2014", reason: "Slick, stylish action with one of cinema's best fight choreographies." },
        { title: "Mission: Impossible – Fallout", year: "2018", reason: "The best Mission Impossible film with jaw-dropping stunts." }
      ]
    };
  }
  if (p.includes('horror') || p.includes('scary') || p.includes('scary')) {
    return {
      message: "Here are some great horror picks:",
      suggestions: [
        { title: "Hereditary", year: "2018", reason: "One of the scariest and most unsettling horror films in years." },
        { title: "Get Out", year: "2017", reason: "A brilliantly crafted horror-thriller with sharp social commentary." },
        { title: "A Quiet Place", year: "2018", reason: "Tense, original horror that keeps you on the edge of your seat." }
      ]
    };
  }
  if (p.includes('sci-fi') || p.includes('space') || p.includes('future') || p.includes('science')) {
    return {
      message: "Here are some great sci-fi picks:",
      suggestions: [
        { title: "Interstellar", year: "2014", reason: "A visually stunning and emotionally powerful space epic." },
        { title: "Arrival", year: "2016", reason: "A thoughtful and beautifully crafted sci-fi film about first contact." },
        { title: "The Martian", year: "2015", reason: "A gripping survival story set on Mars with great humour." }
      ]
    };
  }
  if (p.includes('adam sandler')) {
    return {
      message: "Here are some great Adam Sandler picks:",
      suggestions: [
        { title: "Uncut Gems", year: "2019", reason: "Sandler's best dramatic performance — thrilling and intense." },
        { title: "Happy Gilmore", year: "1996", reason: "A classic Sandler comedy about golf — endlessly funny." },
        { title: "Hubie Halloween", year: "2020", reason: "A fun, light-hearted Halloween comedy perfect for a casual watch." }
      ]
    };
  }

  // Generic fallback
  return {
    message: "Here are some highly rated films you might enjoy:",
    suggestions: [
      { title: "The Shawshank Redemption", year: "1994", reason: "The highest rated film on IMDb — a timeless classic." },
      { title: "Parasite", year: "2019", reason: "Oscar-winning masterpiece — gripping, funny and shocking." },
      { title: "Inception", year: "2010", reason: "A mind-bending thriller that rewards multiple viewings." }
    ]
  };
}

module.exports = { getSuggestions };