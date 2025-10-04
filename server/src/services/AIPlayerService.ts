import { Card, Suit } from "../types";

export class AIPlayerService {
  /**
   * Improved AI bidding logic that considers hand strength and previous bids.
   * @param hand The AI's hand of cards
   * @param trumpSuit The trump suit for the round
   * @param roundNumber The current round number (number of cards per player)
   * @param previousBids Array of previous players' bids (in order)
   * @param isLastBidder Whether this AI is the last to bid in the round
   * @returns The bid for this round
   */
  calculateBid(
    hand: Card[],
    trumpSuit: Suit,
    roundNumber: number,
    previousBids: number[],
    isLastBidder: boolean
  ): number {
    // Card values in descending order of strength
    const strongValues = [14, 13, 12, 11]; // Ace, King, Queen, Jack
    let greedyBid = 0;

    // Count trump cards (always valuable)
    const trumpCards = hand.filter(card => card.suit === trumpSuit);
    greedyBid += trumpCards.length;

    // Count strong non-trump cards (Ace, King, Queen, Jack)
    const nonTrumpCards = hand.filter(card => card.suit !== trumpSuit);
    for (const value of strongValues) {
      greedyBid += nonTrumpCards.filter(card => card.value === value).length;
    }

    // Calculate remaining tricks based on previous bids
    const sumOfPreviousBids = previousBids.reduce((sum, b) => sum + b, 0);
    let remainingTricks = roundNumber - sumOfPreviousBids;
    
    // First calculate intended bid
    let bid = Math.min(greedyBid, hand.length);

    // If last bidder, avoid making sum == roundNumber
    if (isLastBidder) {
      // Check if our intended bid would make the total equal to roundNumber
      if (sumOfPreviousBids + bid === roundNumber) {
        // Adjust the bid to avoid the forbidden total
        if (bid > 0) {
          bid--; // Decrease by 1 if possible
        } else if (bid < hand.length) {
          bid++; // Increase by 1 if we were going to bid 0
        }
        // Edge case: if bid is 0 and we can't increase (hand.length = 0), 
        // we're forced to bid 0 which is handled by the server validator
      }
    }

    // Ensure bid is within valid range
    return Math.max(0, Math.min(bid, hand.length));
  }

  // TODO: improve this AI playing logic for tough games
  selectCard(
    cards: Card[],
    playedCards: Card[],
    trumpSuit: Suit,
    currentSuit?: Suit
  ): Card {
    // Determine lead suit
    let leadSuit = currentSuit;
    if (!leadSuit && playedCards.length > 0) {
      leadSuit = playedCards[0].suit;
    }

    // If lead suit is present, must play it if possible
    if (leadSuit) {
      const suitCards = cards.filter(card => card.suit === leadSuit);
      if (suitCards.length > 0) {
        // Play highest card of lead suit (or lowest, your strategy)
        return suitCards.sort((a, b) => b.value - a.value)[0];
      }
      // If no lead suit, can play any card (maybe prefer trump or lowest)
      const trumpCards = cards.filter(card => card.suit === trumpSuit);
      if (trumpCards.length > 0) {
        return trumpCards.sort((a, b) => b.value - a.value)[0];
      }
    }
    // Otherwise, play lowest card
    return cards.sort((a, b) => a.value - b.value)[0];
  }
}