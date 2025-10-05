import { useState, useEffect } from 'react';
// import { socket } from './utils/socket';
import './App.css';
import { Game } from './components/Game';

function App() {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');

  // useEffect(() => {
  //   socket.on('gameCreated', (game) => {
  //     console.log('Game created event:', game);
  //     setGameId(game.id);
  //     setGameState(game);
  //   });

  //   socket.on('gameState', (state) => {
  //     setGameState(state);
  //   });

  //   socket.on('error', (errorMessage) => {
  //     setError(errorMessage);
  //   });

  //   socket.on('playerJoined', (player) => {
  //     console.log('Player joined:', player);
  //   });

  //   socket.on('gameReadyToStart', () => {
  //     console.log('Game ready to start!');
  //   });

  //   return () => {
  //     socket.off('gameCreated');
  //     socket.off('gameState');
  //     socket.off('error');
  //     socket.off('playerJoined');
  //     socket.off('gameReadyToStart');
  //   };
  // }, []);

  // const createGame = () => {
  //   console.log("called...")
  //   socket.emit('createGame', 5);
  // };

  // const joinGame = () => {
  //   if (!gameId || !playerName) {
  //     setError('Game ID and Player Name are required');
  //     return;
  //   }
  //   socket.emit('joinGame', gameId, playerName);
  // };

  return (
    <div className="App">
      <Game />
      {/* {!gameState ? (
        <div className="game-setup">
          <h1>Judgement Game</h1>
          {error && <div className="error">{error}</div>}
          <div className="create-game">
            <button onClick={createGame}>Create New Game</button>
          </div>
          <div className="join-game">
            <input
              type="text"
              placeholder="Game ID"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button onClick={joinGame}>Join Game</button>
          </div>
        </div>
      ) : (
        <div className="game-room">
          <h2>Game Room: {gameState.gameId}</h2>
          <div className="players">
            <h3>Players:</h3>
            <ul>
              {gameState.players.map(player => (
                <li key={player.id}>
                  {player.name} {player.isHost && '(Host)'}
                </li>
              ))}
            </ul>
          </div>
          {gameState.status === 'WAITING' && (
            <p>Waiting for players... ({gameState.players.length}/4)</p>
          )}
        </div>
      )} */}
    </div>
  );
}

export default App;