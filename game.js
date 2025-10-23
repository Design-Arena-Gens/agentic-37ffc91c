// Supabase configuration
const SUPABASE_URL = 'https://wnebyvojwnjrqecjlyhy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZWJ5dm9qd25qcnFlY2pseWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODgxNDIsImV4cCI6MjA3NjY2NDE0Mn0.F-4VLFeqB_WT26n4fI4XeZan6OBn1x8e5PwXyD71McU';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game state
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let moveCount = 0;
let gameStartTime = Date.now();

// Winning combinations
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// DOM elements
const cells = document.querySelectorAll('.cell');
const resetBtn = document.getElementById('resetBtn');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const gameStatus = document.getElementById('gameStatus');
const totalGamesDisplay = document.getElementById('totalGames');
const xWinsDisplay = document.getElementById('xWins');
const oWinsDisplay = document.getElementById('oWins');
const drawsDisplay = document.getElementById('draws');
const leaderboardList = document.getElementById('leaderboardList');

// Initialize game
function init() {
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetBtn.addEventListener('click', resetGame);
    loadStats();
    loadLeaderboard();
}

// Handle cell click
function handleCellClick(e) {
    const cellIndex = parseInt(e.target.getAttribute('data-cell-index'));

    if (board[cellIndex] !== '' || !gameActive) {
        return;
    }

    updateCell(e.target, cellIndex);
    checkResult();
}

// Update cell
function updateCell(cell, index) {
    board[index] = currentPlayer;
    cell.textContent = currentPlayer;
    cell.classList.add('taken', currentPlayer.toLowerCase());
    moveCount++;
}

// Check game result
function checkResult() {
    let roundWon = false;
    let winningCells = [];

    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCells = [a, b, c];
            break;
        }
    }

    if (roundWon) {
        gameStatus.textContent = `Player ${currentPlayer} wins! 🎉`;
        gameActive = false;
        highlightWinningCells(winningCells);
        saveGameResult(currentPlayer);
        return;
    }

    if (!board.includes('')) {
        gameStatus.textContent = "It's a draw! 🤝";
        gameActive = false;
        saveGameResult('draw');
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateCurrentPlayerDisplay();
}

// Highlight winning cells
function highlightWinningCells(cells) {
    cells.forEach(index => {
        document.querySelector(`[data-cell-index="${index}"]`).classList.add('winner');
    });
}

// Update current player display
function updateCurrentPlayerDisplay() {
    const playerClass = currentPlayer === 'X' ? 'player-x' : 'player-o';
    currentPlayerDisplay.innerHTML = `Current Player: <span class="${playerClass}">${currentPlayer}</span>`;
}

// Save game result to Supabase
async function saveGameResult(winner) {
    const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);

    try {
        const { data, error } = await supabaseClient
            .from('games')
            .insert([
                {
                    winner: winner,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error saving game:', error);
        } else {
            console.log('Game saved successfully');
            // Refresh stats and leaderboard
            setTimeout(() => {
                loadStats();
                loadLeaderboard();
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        // Get all games
        const { data: games, error } = await supabaseClient
            .from('games')
            .select('winner');

        if (error) {
            console.error('Error loading stats:', error);
            return;
        }

        const total = games.length;
        const xWins = games.filter(g => g.winner === 'X').length;
        const oWins = games.filter(g => g.winner === 'O').length;
        const draws = games.filter(g => g.winner === 'draw').length;

        totalGamesDisplay.textContent = total;
        xWinsDisplay.textContent = xWins;
        oWinsDisplay.textContent = oWins;
        drawsDisplay.textContent = draws;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const { data: games, error } = await supabaseClient
            .from('games')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<p class="loading">Error loading games</p>';
            return;
        }

        if (games.length === 0) {
            leaderboardList.innerHTML = '<p class="loading">No games yet. Be the first to play!</p>';
            return;
        }

        leaderboardList.innerHTML = games.map((game, index) => {
            const resultText = game.winner === 'draw' ? 'Draw' : `${game.winner} Won`;
            const resultClass = game.winner === 'draw' ? 'draw' : `winner-${game.winner.toLowerCase()}`;
            const timeAgo = getTimeAgo(new Date(game.created_at));

            return `
                <div class="leaderboard-item">
                    <div>
                        <span style="color: #95a5a6; margin-right: 10px;">#${index + 1}</span>
                        <span class="game-result ${resultClass}">${resultText}</span>
                    </div>
                    <div class="game-time">${timeAgo}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        leaderboardList.innerHTML = '<p class="loading">Error loading games</p>';
    }
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Reset game
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    moveCount = 0;
    gameStartTime = Date.now();
    gameStatus.textContent = '';

    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
    });

    updateCurrentPlayerDisplay();
}

// Initialize the game when page loads
init();
