const getSuitSymbol = (suit) => {
  switch (suit) {
    case "HEARTS":
      return "♥";
    case "DIAMONDS":
      return "♦";
    case "CLUBS":
      return "♣";
    case "SPADES":
      return "♠";
    default:
      return "?";
  }
};

const getCardValue = (value) => {
  const map = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  return map[value] || value;
};

const formatBid = (bid) => {
  if (typeof bid === "number" && bid >= 0) {
    return bid;
  }
  return "–";
};

const formatTricks = (tricks) => {
  if (typeof tricks === "number") {
    return tricks;
  }
  return "0";
};

export { getSuitSymbol, getCardValue, formatBid, formatTricks };
