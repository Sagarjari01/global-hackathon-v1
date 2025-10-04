import React, { useEffect, useState } from "react";
import { socket } from "../utils/socket";

// interface GameState {
//   gameId: string;
//   players: Array<{
//     id: string;
//     name: string;
//     score: number;
//     currentBid?: number;
//     tricks?: number;
//   }>;
//   status: 'WAITING' | 'BIDDING' | 'PLAYING' | 'FINISHED';
//   currentTurn: string;
// }

export const Game = () => {
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [playerCards, setPlayerCards] = useState([]);
  useEffect(() => {
    socket.on("gameCreated", (game) => {
      console.log("Game created event:", game);
      setGameState(game);
      if (game.players[0].cards) {
        setPlayerCards(game.players[0].cards);
      }
    });

    socket.on("gameStarted", (game) => {
      console.log("Game started event:", game);
      setGameState(game);
    });

    socket.on("gameState", (state) => {
      console.log("Game state updated:", state);
      setGameState(state);
    });

    return () => {
      socket.off("gameCreated");
      socket.off("gameStarted");
      socket.off("gameState");
    };
  }, []);

  const startSinglePlayerGame = () => {
    if (!playerName) return;
    socket.emit("createSinglePlayerGame", playerName);
  };

  const submitBid = () => {
    if (!gameState) return;
    console.log("-----------client placeBid-----------");
    console.log(JSON.stringify(gameState, null, 2));
    console.log("Submitting bid:", gameState.id, bidAmount);
    socket.emit("placeBid", gameState.id, bidAmount);
  };

  const playCard = (card) => {
    if (!gameState) return;
    socket.emit("playCard", gameState.id, card);
  };

  const isPlayerTurn = () => {
    console.log("-------------isPlayerTurn-------------");
    console.log("socket id: ", socket.id);
    console.log(JSON.stringify(gameState, null, 2));
    return gameState?.currentTurn === socket.id;
  };

  const renderGameContent = () => {
    if (gameState.status === 'BIDDING' && isPlayerTurn()) {
      return (
        <div className="bidding-phase">
          <h3>Place your bid</h3>
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

    if (gameState.status === 'PLAYING' && isPlayerTurn()) {
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
              <div key={player.id} className={player.id === gameState.currentTurn ? 'current-turn' : ''}>
                {player.name} - Score: {player.score}
                {player.currentBid !== undefined && ` - Bid: ${player.currentBid}`}
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
