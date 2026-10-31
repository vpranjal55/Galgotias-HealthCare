const POSITIVE = [
  'happy', 'good', 'great', 'calm', 'excited', 'grateful', 'fine', 'okay', 'ok',
  'well', 'better', 'hopeful', 'relaxed', 'love', 'confident', 'peaceful',
  'motivated', 'proud', 'awesome', 'amazing', 'joy', 'content',
];

const NEGATIVE = [
  'sad', 'stressed', 'anxious', 'anxiety', 'depressed', 'depression', 'lonely',
  'tired', 'overwhelmed', 'panic', 'hopeless', 'cry', 'crying', 'angry',
  'upset', 'worried', 'fear', 'scared', 'exhausted', 'worthless', 'empty',
  'insomnia', 'sleepless', 'burnout', 'burnt', 'isolated', 'fail', 'failing',
];

const CRISIS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'self harm', 'self-harm',
  'hurt myself', 'want to die', 'no reason to live',
];

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'crisis';

export interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  hits: string[];
}

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const hits: string[] = [];

  for (const w of CRISIS) {
    if (lower.includes(w)) {
      return { sentiment: 'crisis', score: 12, hits: [w] };
    }
  }

  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      pos += 1;
      hits.push(w);
    }
  }
  for (const w of NEGATIVE) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      neg += 1;
      hits.push(w);
    }
  }

  if (pos === 0 && neg === 0) {
    return { sentiment: 'neutral', score: 62, hits };
  }
  if (neg > pos) {
    const score = Math.max(18, 55 - neg * 10 + pos * 4);
    return { sentiment: 'negative', score, hits };
  }
  if (pos > neg) {
    const score = Math.min(96, 70 + pos * 8 - neg * 5);
    return { sentiment: 'positive', score, hits };
  }
  return { sentiment: 'neutral', score: 58, hits };
}

export function botReply(userText: string, result: SentimentResult, studentName: string): string {
  const first = studentName.split(' ')[0];
  if (result.sentiment === 'crisis') {
    return `I'm really glad you reached out, ${first}. You don't have to go through this alone. I'm immediately requesting a session with your campus counselor and alerting the wellness team. If you are in immediate danger, please contact campus security or a trusted adult right now. I'm here with you.`;
  }
  if (result.sentiment === 'negative') {
    return `Thank you for being honest, ${first}. Feeling ${result.hits.slice(0, 2).join(' and ') || 'low'} is valid, and it doesn't mean you're failing. Let's take one small step: a short walk, a glass of water, or messaging a friend. I'm logging this so we can support you, and I'll keep checking in. Would you like me to request a counselor appointment?`;
  }
  if (result.sentiment === 'positive') {
    return `That's wonderful to hear, ${first}. Holding on to what's going well — ${result.hits.slice(0, 2).join(', ') || 'this energy'} — actually builds resilience. Keep the momentum with a little movement today. I'm updating your wellness score. Anything else on your mind?`;
  }
  return `I'm listening, ${first}. Some days feel ordinary, and that's okay too. A consistent routine — sleep, meals, a short walk — quietly protects your mental health. How have your classes and hostel life been this week?`;
}
