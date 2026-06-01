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

    const raw = await response.json();
    console.log('HF raw response:', JSON.stringify(raw));

    let text = '';
    if (Array.isArray(raw))      text = raw[0]?.generated_text || '';
    else if (raw.generated_text) text = raw.generated_text;
    else if (raw.error)          throw new Error(raw.error);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const parsed = JSON.parse(match[0]);
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid structure');
    }
    return parsed;

  } catch (e) {
    console.error('Chatbot error:', e.message);
    return fallbackSuggestions(userPrompt);
  }
}

function fallbackSuggestions(prompt) {
  const p = prompt.toLowerCase();

  // ── ACTORS / DIRECTORS (check these FIRST) ──────────────────
  if (p.includes('adam sandler')) {
    return {
      message: "Here are some great Adam Sandler picks:",
      suggestions: [
        { title: "Uncut Gems",       year: "2019", reason: "Sandler's best dramatic performance — gripping and intense from start to finish." },
        { title: "Happy Gilmore",    year: "1996", reason: "A classic Sandler comedy about golf — one of his funniest films." },
        { title: "Billy Madison",    year: "1995", reason: "Sandler at his most chaotic and hilarious — a fan favourite." }
      ]
    };
  }
  if (p.includes('will ferrell')) {
    return {
      message: "Here are some great Will Ferrell picks:",
      suggestions: [
        { title: "Elf",             year: "2003", reason: "One of the greatest Christmas comedies ever made." },
        { title: "Step Brothers",   year: "2008", reason: "Ferrell and John C. Reilly at their comedic best." },
        { title: "Anchorman",       year: "2004", reason: "A quotable comedy classic with brilliant ensemble comedy." }
      ]
    };
  }
  if (p.includes('tom hanks')) {
    return {
      message: "Here are some great Tom Hanks picks:",
      suggestions: [
        { title: "Forrest Gump",     year: "1994", reason: "An iconic performance in one of cinema's most beloved films." },
        { title: "Cast Away",        year: "2000", reason: "A masterclass in solo acting — riveting from start to finish." },
        { title: "The Green Mile",   year: "1999", reason: "A deeply emotional and powerful drama with a standout Hanks performance." }
      ]
    };
  }
  if (p.includes('leonardo dicaprio') || p.includes('leo dicaprio')) {
    return {
      message: "Here are some great Leonardo DiCaprio picks:",
      suggestions: [
        { title: "Inception",        year: "2010", reason: "DiCaprio leads this mind-bending thriller with incredible intensity." },
        { title: "The Wolf of Wall Street", year: "2013", reason: "DiCaprio's most electrifying performance in Scorsese's wild ride." },
        { title: "The Revenant",     year: "2015", reason: "His Oscar-winning role in a breathtaking survival epic." }
      ]
    };
  }
  if (p.includes('ryan reynolds')) {
    return {
      message: "Here are some great Ryan Reynolds picks:",
      suggestions: [
        { title: "Deadpool",         year: "2016", reason: "Reynolds is perfectly cast in this hilarious and action-packed superhero film." },
        { title: "Free Guy",         year: "2021", reason: "A fun and original comedy-action film that shows Reynolds at his best." },
        { title: "The Proposal",     year: "2009", reason: "A charming romantic comedy with great chemistry between Reynolds and Bullock." }
      ]
    };
  }
  if (p.includes('dwayne johnson') || p.includes('the rock')) {
    return {
      message: "Here are some great Dwayne Johnson picks:",
      suggestions: [
        { title: "Jumanji: Welcome to the Jungle", year: "2017", reason: "Johnson is hilarious and charming in this fun adventure reboot." },
        { title: "Fast Five",        year: "2011", reason: "The best Fast & Furious film — Johnson steals every scene." },
        { title: "Moana",            year: "2016", reason: "Johnson voices Maui brilliantly in this stunning Disney animated film." }
      ]
    };
  }
  if (p.includes('christopher nolan') || p.includes('nolan')) {
    return {
      message: "Here are some great Christopher Nolan films:",
      suggestions: [
        { title: "The Dark Knight",  year: "2008", reason: "Widely considered one of the greatest superhero films ever made." },
        { title: "Interstellar",     year: "2014", reason: "A visually stunning and emotionally powerful space epic." },
        { title: "Inception",        year: "2010", reason: "A mind-bending thriller that rewards multiple viewings." }
      ]
    };
  }

  // ── GENRES / MOODS (check after actors) ─────────────────────
  if (p.includes('horror') || p.includes('scary') || p.includes('frightening')) {
    return {
      message: "Here are some great horror picks:",
      suggestions: [
        { title: "Hereditary",       year: "2018", reason: "One of the scariest and most unsettling horror films in years." },
        { title: "Get Out",          year: "2017", reason: "A brilliantly crafted horror-thriller with sharp social commentary." },
        { title: "A Quiet Place",    year: "2018", reason: "Tense, original horror that keeps you on the edge of your seat." }
      ]
    };
  }
  if (p.includes('action') || p.includes('fight') || p.includes('explosion')) {
    return {
      message: "Here are some high-energy action picks:",
      suggestions: [
        { title: "Mad Max: Fury Road", year: "2015", reason: "Non-stop action with stunning visuals and a 97% on Rotten Tomatoes." },
        { title: "John Wick",        year: "2014", reason: "Slick, stylish action with one of cinema's best fight choreographies." },
        { title: "Mission: Impossible - Fallout", year: "2018", reason: "The best Mission Impossible film with jaw-dropping stunts." }
      ]
    };
  }
  if (p.includes('funny') || p.includes('comedy') || p.includes('laugh') || p.includes('hilarious')) {
    return {
      message: "Here are some great comedy picks:",
      suggestions: [
        { title: "The Hangover",     year: "2009", reason: "A hilarious comedy about a wild Vegas bachelor party gone wrong." },
        { title: "Superbad",         year: "2007", reason: "A genuinely funny coming-of-age comedy with great performances." },
        { title: "Game Night",       year: "2018", reason: "A brilliantly funny and clever comedy that keeps surprising you." }
      ]
    };
  }
  if (p.includes('romantic') || p.includes('romance') || p.includes('love') || p.includes('date')) {
    return {
      message: "Here are some great romance picks:",
      suggestions: [
        { title: "The Notebook",     year: "2004", reason: "One of the most beloved romantic films of all time." },
        { title: "Crazy, Stupid, Love.", year: "2011", reason: "A smart, funny and heartfelt romantic comedy with a great cast." },
        { title: "La La Land",       year: "2016", reason: "A gorgeous and emotional romance set against a stunning musical backdrop." }
      ]
    };
  }
  if (p.includes('sci-fi') || p.includes('space') || p.includes('future') || p.includes('alien')) {
    return {
      message: "Here are some great sci-fi picks:",
      suggestions: [
        { title: "Interstellar",     year: "2014", reason: "A visually stunning and emotionally powerful space epic." },
        { title: "Arrival",          year: "2016", reason: "A thoughtful and beautifully crafted sci-fi film about first contact." },
        { title: "The Martian",      year: "2015", reason: "A gripping survival story set on Mars with great humour." }
      ]
    };
  }
  if (p.includes('thriller') || p.includes('suspense') || p.includes('mystery') || p.includes('twist')) {
    return {
      message: "Here are some great thriller picks:",
      suggestions: [
        { title: "Gone Girl",        year: "2014", reason: "A razor-sharp thriller with one of cinema's great plot twists." },
        { title: "Prisoners",        year: "2013", reason: "An intense and gripping thriller with outstanding performances." },
        { title: "Knives Out",       year: "2019", reason: "A brilliantly crafted modern mystery that keeps you guessing." }
      ]
    };
  }
  if (p.includes('animated') || p.includes('animation') || p.includes('cartoon') || p.includes('pixar') || p.includes('disney')) {
    return {
      message: "Here are some great animated picks:",
      suggestions: [
        { title: "Spider-Man: Into the Spider-Verse", year: "2018", reason: "A groundbreaking animated film with stunning visuals and heart." },
        { title: "Coco",             year: "2017", reason: "A beautifully animated Pixar film that will make you cry happy tears." },
        { title: "The Lion King",    year: "1994", reason: "One of Disney's greatest films — timeless and emotionally powerful." }
      ]
    };
  }
  if (p.includes('documentary') || p.includes('real') || p.includes('true story')) {
    return {
      message: "Here are some great documentary or true story picks:",
      suggestions: [
        { title: "Free Solo",        year: "2018", reason: "A jaw-dropping documentary about climbing El Capitan without ropes." },
        { title: "The Social Network", year: "2010", reason: "The gripping true story of how Facebook was created — brilliantly told." },
        { title: "Bohemian Rhapsody", year: "2018", reason: "The story of Queen and Freddie Mercury — electric from start to finish." }
      ]
    };
  }
  if (p.includes('sad') || p.includes('emotional') || p.includes('cry') || p.includes('drama')) {
    return {
      message: "Here are some emotionally powerful picks:",
      suggestions: [
        { title: "Schindler's List", year: "1993", reason: "One of the most powerful and important films ever made." },
        { title: "Manchester by the Sea", year: "2016", reason: "A deeply moving drama about grief and guilt — outstanding performances." },
        { title: "The Pursuit of Happyness", year: "2006", reason: "An inspirational and emotional true story with Will Smith at his best." }
      ]
    };
  }

  // ── GENERIC FALLBACK ─────────────────────────────────────────
  return {
    message: "Here are some of the highest rated films you might enjoy:",
    suggestions: [
      { title: "The Shawshank Redemption", year: "1994", reason: "The highest rated film on IMDb — a timeless classic everyone should see." },
      { title: "Parasite",         year: "2019", reason: "Oscar-winning masterpiece — gripping, funny and genuinely shocking." },
      { title: "Inception",        year: "2010", reason: "A mind-bending thriller with stunning visuals that rewards multiple viewings." }
    ]
  };
}

module.exports = { getSuggestions };