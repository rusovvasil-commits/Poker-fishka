
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io("http://localhost:3000");

function App() {
  const [username, setUsername] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [playerHands, setPlayerHands] = useState({});
  const [message, setMessage] = useState('');
  const [currentTurn, setCurrentTurn] = useState(0);
  const [players, setPlayers] = useState({});
  const [pot, setPot] = useState(0);
  const [betAmount, setBetAmount] = useState(0);

  useEffect(() => {
    socket.on("game_started", (data) => {
      setPlayerHands(data.hands);
      setCurrentTurn(data.currentTurn);
      setGameStarted(true);
    });

    socket.on("turn", (data) => {
      setCurrentTurn(data.currentTurn);
    });

    socket.on("message", (msg) => {
      setMessage(msg);
    });

    socket.on("betting_update", (data) => {
      setPot(data.pot);
    });

    socket.on("game_ended", (data) => {
      setMessage(`${data.winner} виграв з поту ${data.pot}!`);
      setGameStarted(false);
    });

    socket.on("reset_game", () => {
      setPlayerHands({});
      setPot(0);
    });

    return () => {
      socket.off("game_started");
      socket.off("turn");
      socket.off("message");
      socket.off("betting_update");
      socket.off("game_ended");
      socket.off("reset_game");
    };
  }, []);

  const handleJoinGame = () => {
    socket.emit("join_game", username);
  };

  const handleNextTurn = () => {
    socket.emit("next_turn");
  };

  const handleBet = (amount) => {
    if (amount > 0) {
      socket.emit("place_bet", amount);
    }
  };

  const handleGetGameState = () => {
    socket.emit("get_game_state");
  };

  return (
    <div className="App">
      <h1>Poker Game</h1>

      {!gameStarted && (
        <>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleJoinGame}>Join Game</button>
        </>
      )}

      {gameStarted && (
        <>
          <h2>{message}</h2>
          <h3>Your Hand: {playerHands && playerHands[username] ? playerHands[username].join(', ') : "Waiting for cards..."}</h3>
          <h3>Pot: {pot}</h3>
          <h3>It's {Object.values(players)[currentTurn]}'s turn!</h3>

          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Enter your bet"
          />
          <button onClick={() => handleBet(betAmount)}>Place Bet</button>

          <button onClick={handleNextTurn}>Next Turn</button>
          <button onClick={handleGetGameState}>Get Game State</button>
        </>
      )}
    </div>
  );
}

export default App;
