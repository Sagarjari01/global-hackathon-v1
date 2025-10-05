import { Card, Suit } from "../types";

export class AIPlayerService {
  /**
   * Improved AI bidding logic that adapts to other players' high bids,
   * avoids making the total bids equal to the round count when last to bid,
   * and adjusts for aggressive or conservative play.
   */
  calculateBid(
    hand: Card[],
    trumpSuit: Suit,
    roundNumber: number,
    previousBids: number[],
    isLastBidder: boolean
  ): number {
    // Original "greedy" components
    const strongValues = [14, 13, 12, 11]; // A, K, Q, J
    let greedyBid = 0;

    const trumpCards = hand.filter(c => c.suit === trumpSuit);
    greedyBid += trumpCards.length;

    const nonTrump = hand.filter(c => c.suit !== trumpSuit);
    for (const val of strongValues) {
      greedyBid += nonTrump.filter(c => c.value === val).length;
    }

    // Adjust for previously placed bids
    const sumPrior = previousBids.reduce((sum, b) => sum + b, 0);
    let bid = Math.min(greedyBid, hand.length);

    // If others placed big bids, be cautious (reduce by 1 if possible)
    const highBidFactor = previousBids.filter(b => b > roundNumber / 2).length;
    if (highBidFactor > 0 && bid > 0) bid--;

    // Avoid sum == roundNumber if last to bid
    if (isLastBidder && sumPrior + bid === roundNumber) {
      if (bid > 0) bid--;
      else if (bid < hand.length) bid++;
    }

    // Still ensure final bid is in valid range
    return Math.max(0, Math.min(bid, hand.length));
  }

  /**
   * Enhanced AI card selection:
   * - Tries not to waste high trump if bid is already satisfied.
   * - If leading, picks strategically from longest suit or high trump if needed.
   * - If following suit, only uses enough power to win the trick.
   * - If bid is already met, discards weaker cards instead of using strong trump.
   */
  selectCard(
    cards: Card[],
    playedCards: Card[],
    trumpSuit: Suit,
    currentSuit?: Suit,
    bidSatisfied?: boolean // optional: pass if the AI knows it made its bid
  ): Card {
    // Determine lead suit if not provided
    let leadSuit = currentSuit;
    if (!leadSuit && playedCards.length > 0) {
      leadSuit = playedCards[0].suit;
    }

    // If we have a lead suit, try to follow it
    if (leadSuit) {
      const followSuitCards = cards.filter(c => c.suit === leadSuit);
      if (followSuitCards.length > 0) {
        // If we still need tricks, play enough to win
        const highestInTrick = this.getHighestCard(playedCards, trumpSuit, leadSuit);
        const canWin = followSuitCards.filter(c => this.isCardHigher(c, highestInTrick, trumpSuit, leadSuit));
        if (canWin.length > 0 && !bidSatisfied) {
          // Play lowest winning card
          return canWin.sort((a, b) => a.value - b.value)[0];
        }
        // Otherwise, discard lowest follow-suit
        return followSuitCards.sort((a, b) => a.value - b.value)[0];
      }

      // Can't follow suit, decide whether to trump or discard
      const trumpCards = cards.filter(c => c.suit === trumpSuit);
      if (trumpCards.length > 0 && !bidSatisfied) {
        // Attempt to trump if we still need tricks
        const highestInTrick = this.getHighestCard(playedCards, trumpSuit, leadSuit);
        const canBeatTrumps = trumpCards.filter(c => this.isCardHigher(c, highestInTrick, trumpSuit, leadSuit));
        if (canBeatTrumps.length > 0) {
          // Play lowest winning trump
          return canBeatTrumps.sort((a, b) => a.value - b.value)[0];
        }
      }
    }

    // If there's no lead suit or we don't want to trump, discard
    // Usually discard lowest, but if we want to burn other players' trump, might lead trump
    if (!bidSatisfied) {
      // Possibly lead with highest trump to force others to use trump
      const trumps = cards.filter(c => c.suit === trumpSuit);
      if (trumps.length > 0 && Math.random() > 0.7) {
        // 30% chance to force a big trump
        return trumps.sort((a, b) => b.value - a.value)[0];
      }
    }

    // Default: throw away lowest card
    return cards.sort((a, b) => a.value - b.value)[0];
  }

  /**
   * Helper: Get the (currently) highest card in trick based on suit / trump
   */
  private getHighestCard(trick: Card[], trump: Suit, leadSuit: Suit): Card {
    if (!trick.length) return trick[0];
    // Filter trump cards first
    const trumpCards = trick.filter(c => c.suit === trump);
    if (trumpCards.length) {
      return trumpCards.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
    }
    // Otherwise lead suit
    const leadCards = trick.filter(c => c.suit === leadSuit);
    if (leadCards.length) {
      return leadCards.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
    }
    // Fallback
    return trick[0];
  }

  /**
   * Helper: Compare two cards to see if 'cardA' beats 'cardB'.
   */
  private isCardHigher(cardA: Card, cardB: Card, trump: Suit, lead: Suit): boolean {
    if (!cardB) return true;
    // If A is trump and B is not
    if (cardA.suit === trump && cardB.suit !== trump) return true;
    // If B is trump and A is not
    if (cardB.suit === trump && cardA.suit !== trump) return false;
    // If same suit, compare value
    if (cardA.suit === cardB.suit) {
      return cardA.value > cardB.value;
    }
    // If A is lead suit but B isn't
    if (cardA.suit === lead && cardB.suit !== lead) return true;
    // Otherwise no
    return false;
  }
}