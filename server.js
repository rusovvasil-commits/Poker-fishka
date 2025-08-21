
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let players = {};
let gameStarted = false;
let currentTurn = 0;
let hands = {};
let pot = 0;
let bets = {};
let roundInProgress = false;

function createDeck() {
    let newDeck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            newDeck.push(rank + suit);
        }
    }
    return newDeck;
}

function dealCards() {
    deck = createDeck();
    hands = {};
    Object.keys(players).forEach(playerId => {
        hands[playerId] = [deck.pop(), deck.pop()];
    });
    io.emit("game_started", { hands, currentTurn });
    io.emit("message", "Гра почалась! Кожен отримав по дві карти.");
}

function nextTurn() {
    currentTurn = (currentTurn + 1) % Object.keys(players).length;
    io.emit("turn", { currentTurn });
}

function placeBet(playerId, amount) {
    if (!bets[playerId]) {
        bets[playerId] = 0;
    }
    bets[playerId] += amount;
    pot += amount;
    io.emit("betting_update", { playerId, bet: bets[playerId], pot });
}

function evaluateHand(hand) {
    let values = hand.map(card => card.slice(0, -1));
    let suits = hand.map(card => card.slice(-1));

    let valueCounts = {};
    values.forEach(val => valueCounts[val] = (valueCounts[val] || 0) + 1);
    let uniqueValues = Object.keys(valueCounts);

    let isFlush = new Set(suits).size === 1;
    let sortedValues = values.map(val => handRanks[val]).sort((a, b) => a - b);
    let isStraight = sortedValues[4] - sortedValues[0] === 4 && new Set(sortedValues).size === 5;

    let isPair = uniqueValues.length === 4;
    let isThreeOfAKind = uniqueValues.length === 3 && Math.max(...Object.values(valueCounts)) === 3;
    let isFourOfAKind = uniqueValues.length === 2 && Math.max(...Object.values(valueCounts)) === 4;
    let isFullHouse = uniqueValues.length === 2 && Math.max(...Object.values(valueCounts)) === 3;

    if (isStraight && isFlush) return { type: 'straight_flush', value: sortedValues[4] };
    if (isFourOfAKind) return { type: 'four_of_a_kind', value: Math.max(...Object.keys(valueCounts)) };
    if (isFullHouse) return { type: 'full_house', value: Math.max(...Object.keys(valueCounts)) };
    if (isFlush) return { type: 'flush', value: sortedValues[4] };
    if (isStraight) return { type: 'straight', value: sortedValues[4] };
    if (isThreeOfAKind) return { type: 'three_of_a_kind', value: Math.max(...Object.keys(valueCounts)) };
    if (isPair) return { type: 'pair', value: Math.max(...Object.keys(valueCounts)) };
    return { type: 'high_card', value: sortedValues[4] };
}

function compareHands(hand1, hand2) {
    const evaluation1 = evaluateHand(hand1);
    const evaluation2 = evaluateHand(hand2);

    if (evaluation1.type === evaluation2.type) {
        if (evaluation1.value === evaluation2.value) {
            return "Нічия!";
        } else {
            return evaluation1.value > evaluation2.value ? "Гравець 1 виграв!" : "Гравець 2 виграв!";
        }
    } else {
        const handRanking = [
            "high_card", "pair", "three_of_a_kind", "straight", 
            "flush", "full_house", "four_of_a_kind", "straight_flush"
        ];

        if (handRanking.indexOf(evaluation1.type) > handRanking.indexOf(evaluation2.type)) {
            return "Гравець 1 виграв!";
        } else {
            return "Гравець 2 виграв!";
        }
    }
}

function determineWinner() {
    const handsArray = Object.values(hands);
    const playerIds = Object.keys(hands);

    let winner = compareHands(handsArray[0], handsArray[1]);
    if (winner === "Нічия!") {
        winner = compareHands(handsArray[0], handsArray[2]);
    }

    io.emit("game_ended", { winner, pot });
    resetGame();
}

function resetGame() {
    hands = {};
    bets = {};
    pot = 0;
    gameStarted = false;
    roundInProgress = false;
    io.emit("reset_game");
}

io.on("connection", (socket) => {
    console.log("Player connected: " + socket.id);

    socket.on("join_game", (username) => {
        players[socket.id] = username;
        console.log(`${username} joined the game.`);

        if (Object.keys(players).length === 3 && !gameStarted) {
            gameStarted = true;
            dealCards(); 
        }
    });

    socket.on("place_bet", (amount) => {
        if (gameStarted && !roundInProgress) {
            placeBet(socket.id, amount); 
            roundInProgress = true;
            setTimeout(() => {
                determineWinner(); 
            }, 10000); 
        }
    });

    socket.on("next_turn", () => {
        if (gameStarted) {
            nextTurn();
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        console.log("Player disconnected: " + socket.id);
        if (gameStarted) {
            io.emit("game_ended", "Гравець покинув гру. Гра завершена.");
            gameStarted = false;
        }
    });

    socket.on("get_game_state", () => {
        if (gameStarted) {
            socket.emit("game_started", { hands, currentTurn });
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
