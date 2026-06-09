// backend/chatbot.js
require('dotenv').config();
const fetch = require('node-fetch');

// ── PROFANITY FILTER ──────────────────────────────────────────
const BANNED = [
  'fuck','shit','bitch','cunt','asshole','bastard','damn','crap',
  'piss','cock','dick','pussy','arse','ass','wank','twat','slut',
  'whore','nigger','nigga','faggot','retard'
];

function containsProfanity(text) {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  return BANNED.some(word => {
    const re = new RegExp(`\\b${word}\\b`);
    return re.test(lower);
  });
}

// ── MAIN EXPORT ───────────────────────────────────────────────
async function getSuggestions(userPrompt, userId) {
  if (containsProfanity(userPrompt)) {
    return {
      message: "Please keep your request family-friendly!",
      suggestions: []
    };
  }

  // Try HuggingFace first
  try {
    const result = await tryHuggingFace(userPrompt);
    if (result) return result;
  } catch (e) {
    console.error('HuggingFace failed:', e.message);
  }

  // Fall back to keyword system
  return fallbackSuggestions(userPrompt);
}

async function tryHuggingFace(userPrompt) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 12000); // 12s timeout

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

Respond with ONLY valid JSON, no explanation, no markdown, no backticks:
{"message":"Here are my suggestions:","suggestions":[{"title":"MOVIE NAME","year":"YEAR","reason":"One sentence why this matches"}]}

Give exactly 3 suggestions of real, well-known, highly-rated movies. [/INST]`,
          parameters: {
            max_new_tokens:  600,
            temperature:     0.4,
            return_full_text: false,
            stop: ["</s>", "[INST]"]
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);
    const raw = await response.json();

    let text = '';
    if (Array.isArray(raw))      text = raw[0]?.generated_text || '';
    else if (raw.generated_text) text = raw.generated_text;
    else if (raw.error)          throw new Error(raw.error);

    // Strip any markdown fences
    text = text.replace(/```json|```/g, '').trim();

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');

    const parsed = JSON.parse(match[0]);
    if (!parsed.suggestions?.length) throw new Error('Empty suggestions');

    // Ensure all suggestions have required fields
    parsed.suggestions = parsed.suggestions.slice(0, 3).map(s => ({
      title:  s.title  || 'Unknown',
      year:   s.year   || '',
      reason: s.reason || 'A great match for your request.'
    }));

    return parsed;

  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ── KEYWORD FALLBACK ──────────────────────────────────────────
function fallbackSuggestions(prompt) {
  const p = prompt.toLowerCase();

  // Actors first
  if (p.includes('adam sandler'))
    return { message: "Great Adam Sandler picks:", suggestions: [
      { title: "Uncut Gems",    year: "2019", reason: "Sandler's most intense dramatic performance — a gripping thriller." },
      { title: "Happy Gilmore", year: "1996", reason: "Classic Sandler comedy gold — endlessly rewatchable." },
      { title: "Billy Madison", year: "1995", reason: "Sandler at his most chaotic and hilarious." }
    ]};

  if (p.includes('kevin hart'))
    return { message: "Great Kevin Hart picks:", suggestions: [
      { title: "Ride Along",                        year: "2014", reason: "Hart at his comedic best in this buddy cop action-comedy." },
      { title: "Central Intelligence",              year: "2016", reason: "Hart and The Rock deliver non-stop laughs." },
      { title: "Jumanji: Welcome to the Jungle",   year: "2017", reason: "Hart steals every scene in this fun adventure reboot." }
    ]};

  if (p.includes('will ferrell'))
    return { message: "Great Will Ferrell picks:", suggestions: [
      { title: "Elf",          year: "2003", reason: "One of the greatest Christmas comedies ever made." },
      { title: "Step Brothers", year: "2008", reason: "Ferrell and Reilly at their comedic best." },
      { title: "Anchorman",    year: "2004", reason: "A quotable comedy classic — absolutely hilarious." }
    ]};

  if (p.includes('tom hanks'))
    return { message: "Great Tom Hanks picks:", suggestions: [
      { title: "Forrest Gump",   year: "1994", reason: "An iconic Hanks performance in cinema's most beloved film." },
      { title: "Cast Away",      year: "2000", reason: "A masterclass in solo acting — riveting throughout." },
      { title: "The Green Mile", year: "1999", reason: "Deeply emotional drama with a standout Hanks performance." }
    ]};

  if (p.includes('leonardo dicaprio') || p.includes('leo dicaprio'))
    return { message: "Great Leonardo DiCaprio picks:", suggestions: [
      { title: "Inception",               year: "2010", reason: "DiCaprio leads this mind-bending thriller brilliantly." },
      { title: "The Wolf of Wall Street", year: "2013", reason: "His most electrifying performance in Scorsese's wild ride." },
      { title: "The Revenant",            year: "2015", reason: "His Oscar-winning role in a breathtaking survival epic." }
    ]};

  if (p.includes('ryan reynolds'))
    return { message: "Great Ryan Reynolds picks:", suggestions: [
      { title: "Deadpool",      year: "2016", reason: "Reynolds is perfectly cast in this hilarious superhero film." },
      { title: "Free Guy",      year: "2021", reason: "A fun, original comedy-action film at its best." },
      { title: "The Proposal",  year: "2009", reason: "A charming rom-com with great chemistry." }
    ]};

  if (p.includes('dwayne johnson') || p.includes('the rock'))
    return { message: "Great Dwayne Johnson picks:", suggestions: [
      { title: "Jumanji: Welcome to the Jungle", year: "2017", reason: "Johnson is hilarious in this adventure reboot." },
      { title: "Fast Five",    year: "2011", reason: "The best Fast & Furious — Johnson steals every scene." },
      { title: "Moana",        year: "2016", reason: "Johnson voices Maui brilliantly in this stunning Disney film." }
    ]};

  if (p.includes('christopher nolan') || p.includes('nolan'))
    return { message: "Great Christopher Nolan films:", suggestions: [
      { title: "The Dark Knight", year: "2008", reason: "One of the greatest films ever made." },
      { title: "Interstellar",    year: "2014", reason: "Visually stunning and emotionally powerful space epic." },
      { title: "Inception",       year: "2010", reason: "A mind-bending thriller that rewards every viewing." }
    ]};

  if (p.includes('jim carrey'))
    return { message: "Great Jim Carrey picks:", suggestions: [
      { title: "The Truman Show", year: "1998", reason: "Brilliant blend of comedy and philosophical depth." },
      { title: "Eternal Sunshine of the Spotless Mind", year: "2004", reason: "Carrey's best dramatic role — a mind-bending romance." },
      { title: "Ace Ventura: Pet Detective", year: "1994", reason: "Peak Jim Carrey comedy — absolutely unforgettable." }
    ]};

  if (p.includes('jackie chan'))
    return { message: "Great Jackie Chan picks:", suggestions: [
      { title: "Police Story", year: "1985", reason: "The film that made Jackie Chan a legend." },
      { title: "Rush Hour",    year: "1998", reason: "Chan and Tucker in a perfect action-comedy." },
      { title: "Supercop",     year: "1992", reason: "Death-defying stunts and comedic brilliance." }
    ]};

  if (p.includes('eddie murphy'))
    return { message: "Great Eddie Murphy picks:", suggestions: [
      { title: "Beverly Hills Cop",    year: "1984", reason: "The iconic role that made Eddie Murphy a star." },
      { title: "Coming to America",    year: "1988", reason: "A comedy classic with Murphy at his very best." },
      { title: "The Nutty Professor",  year: "1996", reason: "Murphy plays multiple hilarious characters brilliantly." }
    ]};

  // Genres / moods
  if (p.includes('horror') || p.includes('scary') || p.includes('frightening'))
    return { message: "Great horror picks:", suggestions: [
      { title: "Hereditary",    year: "2018", reason: "One of the most unsettling horror films in years." },
      { title: "Get Out",       year: "2017", reason: "Brilliantly crafted horror-thriller with sharp social commentary." },
      { title: "A Quiet Place", year: "2018", reason: "Tense, original horror that keeps you on the edge of your seat." }
    ]};

  if (p.includes('action') || p.includes('fight') || p.includes('explosion'))
    return { message: "High-energy action picks:", suggestions: [
      { title: "Mad Max: Fury Road",               year: "2015", reason: "Non-stop action with stunning visuals — 97% on Rotten Tomatoes." },
      { title: "John Wick",                        year: "2014", reason: "Slick, stylish action with cinema's best fight choreography." },
      { title: "Mission: Impossible - Fallout",   year: "2018", reason: "The best Mission Impossible film with jaw-dropping stunts." }
    ]};

  if (p.includes('funny') || p.includes('comedy') || p.includes('laugh') || p.includes('hilarious'))
    return { message: "Great comedy picks:", suggestions: [
      { title: "The Hangover", year: "2009", reason: "Hilarious comedy about a Vegas bachelor party gone very wrong." },
      { title: "Superbad",     year: "2007", reason: "A genuinely funny coming-of-age comedy." },
      { title: "Game Night",   year: "2018", reason: "Brilliantly funny and clever — keeps surprising you." }
    ]};

  if (p.includes('romantic') || p.includes('romance') || p.includes('love') || p.includes('date night'))
    return { message: "Great romance picks:", suggestions: [
      { title: "The Notebook",         year: "2004", reason: "One of the most beloved romantic films of all time." },
      { title: "Crazy, Stupid, Love.", year: "2011", reason: "Smart, funny and heartfelt with a great cast." },
      { title: "La La Land",           year: "2016", reason: "Gorgeous and emotional romance with a stunning musical backdrop." }
    ]};

  if (p.includes('sci-fi') || p.includes('space') || p.includes('future') || p.includes('alien'))
    return { message: "Great sci-fi picks:", suggestions: [
      { title: "Interstellar", year: "2014", reason: "Visually stunning and emotionally powerful space epic." },
      { title: "Arrival",      year: "2016", reason: "Thoughtful, beautifully crafted film about first contact." },
      { title: "The Martian",  year: "2015", reason: "Gripping survival story on Mars with great humour." }
    ]};

  if (p.includes('thriller') || p.includes('suspense') || p.includes('mystery') || p.includes('twist'))
    return { message: "Great thriller picks:", suggestions: [
      { title: "Gone Girl",   year: "2014", reason: "Razor-sharp thriller with one of cinema's great plot twists." },
      { title: "Prisoners",   year: "2013", reason: "Intense and gripping with outstanding performances." },
      { title: "Knives Out",  year: "2019", reason: "A brilliantly crafted modern mystery — keeps you guessing." }
    ]};

  if (p.includes('animated') || p.includes('animation') || p.includes('cartoon') || p.includes('pixar') || p.includes('disney'))
    return { message: "Great animated picks:", suggestions: [
      { title: "Spider-Man: Into the Spider-Verse", year: "2018", reason: "Groundbreaking animated film with stunning visuals and heart." },
      { title: "Coco",       year: "2017", reason: "Beautifully animated Pixar film — will make you cry happy tears." },
      { title: "The Lion King", year: "1994", reason: "One of Disney's greatest films — timeless and emotionally powerful." }
    ]};

  if (p.includes('documentary') || p.includes('true story'))
    return { message: "Great documentary or true story picks:", suggestions: [
      { title: "Free Solo",           year: "2018", reason: "Jaw-dropping documentary about climbing El Capitan without ropes." },
      { title: "The Social Network",  year: "2010", reason: "Gripping true story of how Facebook was created." },
      { title: "Bohemian Rhapsody",   year: "2018", reason: "The story of Queen and Freddie Mercury — electric." }
    ]};

  if (p.includes('sad') || p.includes('emotional') || p.includes('cry') || p.includes('drama'))
    return { message: "Emotionally powerful picks:", suggestions: [
      { title: "Schindler's List",            year: "1993", reason: "One of the most powerful films ever made." },
      { title: "Manchester by the Sea",       year: "2016", reason: "Deeply moving drama about grief — outstanding performances." },
      { title: "The Pursuit of Happyness",    year: "2006", reason: "Inspirational true story with Will Smith at his best." }
    ]};

  if (p.includes('family') || p.includes('kids') || p.includes('children'))
    return { message: "Great family picks:", suggestions: [
      { title: "The Incredibles", year: "2004", reason: "Pixar's superhero masterpiece — loved by all ages." },
      { title: "Home Alone",      year: "1990", reason: "A timeless family comedy classic." },
      { title: "Toy Story",       year: "1995", reason: "The film that launched Pixar — still magical after all these years." }
    ]};

  if (p.includes('short') || p.includes('quick') || p.includes('under 90') || p.includes('brief'))
    return { message: "Great shorter films (under 95 mins):", suggestions: [
      { title: "Whiplash",    year: "2014", reason: "Intense, gripping, and only 107 minutes — feels half that long." },
      { title: "Good Will Hunting", year: "1997", reason: "Deeply emotional drama that flies by." },
      { title: "Moonrise Kingdom",  year: "2012", reason: "Charming, funny, and beautifully paced — a joy throughout." }
    ]};

  // Generic fallback
  return {
    message: "Here are some of the highest rated films you might enjoy:",
    suggestions: [
      { title: "The Shawshank Redemption", year: "1994", reason: "The highest rated film on IMDb — a timeless classic." },
      { title: "Parasite",    year: "2019", reason: "Oscar-winning masterpiece — gripping, funny and genuinely shocking." },
      { title: "Inception",   year: "2010", reason: "Mind-bending thriller with stunning visuals that rewards every viewing." }
    ]
  };
}

module.exports = { getSuggestions };