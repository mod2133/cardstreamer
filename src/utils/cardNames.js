// Convert card codes (e.g., "KS") to readable names (e.g., "King of Spades")

const RANKS = {
  'A': 'Ace',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King'
};

const SUITS = {
  'S': 'Spades',
  'H': 'Hearts',
  'D': 'Diamonds',
  'C': 'Clubs'
};

export function getCardName(cardCode) {
  if (!cardCode || cardCode.length < 2) {
    return cardCode;
  }

  // Handle 10 specially (e.g., "10S")
  let rank, suit;
  if (cardCode.startsWith('10')) {
    rank = '10';
    suit = cardCode[2];
  } else {
    rank = cardCode[0];
    suit = cardCode[1];
  }

  const rankName = RANKS[rank] || rank;
  const suitName = SUITS[suit] || suit;

  return `${rankName} of ${suitName}`;
}
