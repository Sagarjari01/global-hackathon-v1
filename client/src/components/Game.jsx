import React, { useEffect, useState } from "react";
import { apiService } from "../services/api.service";

export const Game = () => {
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [playerCards, setPlayerCards] = useState([]);
  const [bidError, setBidError] = useState("");

  useEffect(() => {
    if (gameState) {
      const humanPlayer = gameState.players.find(p => p.id === 'player-1');
      if (humanPlayer?.cards) {
        setPlayerCards(humanPlayer.cards);
      }
    }
  }, [gameState]);

  const startSinglePlayerGame = async () => {
    if (!playerName) return;
    try {
      const game = await apiService.createGame(playerName);
      setGameState(game);
      const humanPlayer = game.players.find(p => p.id === 'player-1');
      if (humanPlayer?.cards) {
        setPlayerCards(humanPlayer.cards);
      }
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  // Client-side bid validation that mirrors server-side logic
  const isValidBid = (bid) => {
    if (!gameState) return false;
    
    // Basic range check
    if (bid < 0 || bid > gameState.currentRound) {
      setBidError(`Bid must be between 0 and ${gameState.currentRound}`);
      return false;
    }

    // Check for last bidder constraint
    const biddingPlayers = gameState.players.filter(
      p => p.id !== 'player-1' && typeof p.currentBid === 'number' && p.currentBid >= 0
    );
    
    // If we're the last player to bid (all other players have bid)
    if (biddingPlayers.length === gameState.players.length - 1) {
      const sumOfPreviousBids = biddingPlayers.reduce(
        (sum, p) => sum + p.currentBid, 
        0
      );
      
      if (sumOfPreviousBids + bid === gameState.currentRound) {
        setBidError(`Last bidder cannot make total bids equal to ${gameState.currentRound}`);
        return false;
      }
    }
    
    setBidError("");
    return true;
  };

  const submitBid = async () => {
    if (!gameState) return;
    
    // Validate bid before API call
    if (!isValidBid(bidAmount)) {
      return; // Don't submit if invalid
    }
    
    try {
      const updatedState = await apiService.placeBid(gameState.id, bidAmount);
      setGameState(updatedState);
    } catch (error) {
      console.error('Failed to submit bid:', error);
      setBidError(error.message || 'Failed to submit bid');
    }
  };
  
  const playCard = async (card) => {
    if (!gameState) return;
    try {
      const updatedState = await apiService.playCard(gameState.id, card);
      setGameState(updatedState);
    } catch (error) {
      console.error('Failed to play card:', error);
    }
  };

  const isPlayerTurn = () => {
    return gameState?.currentTurn === 'player-1';
  };

  const renderGameContent = () => {
    // render bidding phase
    if (gameState.status === "BIDDING" && isPlayerTurn()) {
      return (
        <div className="bidding-phase">
          <h3>Your Cards:</h3>
          <div className="cards-container">
            {playerCards.map((card, index) => (
              <div key={index} className="card">
                {`${card.value} of ${card.suit}`}
              </div>
            ))}
          </div>
          <h3>Place your bid</h3>
          {bidError && <div className="error">{bidError}</div>}
          <input
            type="number"
            min="0"
            max={playerCards.length}
            value={bidAmount}
            onChange={(e) => setBidAmount(parseInt(e.target.value))}
          />
          <button onClick={submitBid}>Submit Bid</button>
        </div>
      );
    }

    // render playing phase
    if (gameState.status === "PLAYING" && isPlayerTurn()) {
      return (
        <div className="playing-phase">
          <h3>Your Cards:</h3>
          <div className="cards-container">
            {playerCards.map((card, index) => (
              <button
                key={index}
                onClick={() => playCard(card)}
                className="card"
              >
                {`${card.value} of ${card.suit}`}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return <p>Waiting for other players...</p>;
  };

  return (
    <div>
      {!gameState ? (
        <div>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
          <button onClick={startSinglePlayerGame}>Start Game with AI</button>
        </div>
      ) : (
        <div>
          <h2>Game Status: {gameState.status}</h2>
          <div>
            <h3>Players:</h3>
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={
                  player.id === gameState.currentTurn ? "current-turn" : ""
                }
              >
                {player.name} - Score: {player.score}
                {player.currentBid !== undefined &&
                  ` - Bid: ${player.currentBid}`}
                {player.tricks !== undefined && ` - Tricks: ${player.tricks}`}
              </div>
            ))}
          </div>
          {renderGameContent()}
        </div>
      )}
    </div>
  );
};
