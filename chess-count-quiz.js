// -----------------------------------------------------------
// Global variables

let chess_data = null; // See loadSettings for value of chess_data


// -----------------------------------------------------------
// Chess functions

// Return the number of possible checking moves
function countChecks(game) {
    let checks = 0;
    const moves = game.moves({ verbose: true }); // Get all moves with details

    // Temporary game instance to make moves without affecting the original game
    let tempGame = new Chess(game.fen());

    for (let move of moves) {
        tempGame.move(move);
        if (tempGame.in_check()) {
            checks++;
        }
        tempGame.undo(); // Undo move to try the next one
    }

    return checks;
}

// Return the number of possible capturing moves
function countCaptures(game) {
    // Get all legal moves for the current player
    const moves = game.moves({ verbose: true });
    // Filter the moves to only include captures
    const capturingMoves = moves.filter(move => move.flags.includes('c') || move.flags.includes('e'));
    // Return the number of capturing moves
    return capturingMoves.length;
}

// Return a game where it's the specified player to move ('w' or 'b') from the given FEN
function colorToMove(fen, side) {
    var fenParts = fen.split(' ');
    fenParts[1] = side;
    const modifiedFen = fenParts.join(' ');
    var game = new Chess();
    game.load(modifiedFen);
    return game;
}

// Return array of positions in FEN format
async function getPositions() {
    const response = await fetch('lichess-puzzles/black_small.fen');
    const text = await response.text();
    const positions = text.split('\n');
    if (positions.length <= 0) {
	console.log("Error with positions file");
    }
    return positions;
}

// Grab a random FEN from the FEN text file
//
// Example: const fen = '5rk1/pp6/3q3p/2pP2pB/2P5/4Q1P1/PP4PK/8 w - - 8 31';    
function getRandomPosition(positions) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    return positions[randomIndex];
}

// Return object with correct counts for black and white from given fen
function getCorrectAnswers(fen) {
    white_to_move = colorToMove(fen, 'w');
    black_to_move = colorToMove(fen, 'b');
    const correctAnswers = {
	whiteChecks: countChecks(white_to_move),
	whiteCaptures: countCaptures(white_to_move),
	blackChecks: countChecks(black_to_move),
	blackCaptures: countCaptures(black_to_move)
    };
    return correctAnswers;
}

// -----------------------------------------------------------
// Timer and score code

// Update the display based on the internal timer
function updateTimerDisplay() {
    const minutes = Math.floor(chess_data.timeRemaining / 60);
    const seconds = chess_data.timeRemaining % 60;
    document.getElementById('timer').textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update the score based on the internal timer
function incrementScore() {
    chess_data.score++;
    document.getElementById('score').textContent = `Score: ${chess_data.score}`;
}

// Set the score back to 0
function resetScore() {
    chess_data.score = 0;
    document.getElementById('score').textContent = `Score: ${chess_data.score}`;
}

// Start the timer count down
function initTimer() {
    timerInterval = setInterval(() => {
        chess_data.timeRemaining = Math.max(0, chess_data.timeRemaining - 1);
	updateTimerDisplay(chess_data);
	
        if (chess_data.timeRemaining <= 0) {
	    endGame(chess_data);
        }
    }, 1000);
}

// Start the timer and decrement by 1 every second
function startTimer() {
    if (chess_data.showTimer) {
	chess_data.timeRemaining = chess_data.defaultTimeRemaining;
    } else {
	chess_data.timeRemaining = Infinity;
    }
    setTimerVisibility(chess_data.showTimer);
}

// Deduct 10 seconds for incorrect answer
function penalizeTime() {
    chess_data.timeRemaining = Math.max(0, chess_data.timeRemaining - 10); // lose 10 seconds per wrong answer
    updateTimerDisplay(chess_data);
}
    

// This gets called when the game timer runs out
function endGame() {
    alert(`Time's up! Final Score: ${chess_data.score}`);
    startNewGame();
}


// ----------------------------------------------------------
// User input code

document.querySelectorAll('.increment').forEach(button => {
    button.addEventListener('click', function() {
        const input = this.previousElementSibling; // Assumes the input field is immediately before the increment button
        input.value = parseInt(input.value, 10) + 1;
    });
});

document.querySelectorAll('.decrement').forEach(button => {
    button.addEventListener('click', function() {
        const input = this.nextElementSibling; // Assumes the input field is immediately after the decrement button
        if (parseInt(input.value, 10) > 0) { // Prevents negative numbers
            input.value = parseInt(input.value, 10) - 1;
        }
    });
});


// -----------------------------------------------------------
// General page code

// Load a new puzzle and reset inputs
function loadNewPuzzle() {
    chess_data.fen = getRandomPosition(chess_data.positions);
    chess_data.board.position(chess_data.fen);
    chess_data.correct = getCorrectAnswers(chess_data.fen);
    chess_data.is_correct = { whiteChecks: false, whiteCaptures: false,
			      blackChecks: false, blackCaptures: false };

    console.log(chess_data);
    
    ['whiteChecks', 'whiteCaptures', 'blackChecks', 'blackCaptures'].forEach((id) => {
	const input = document.getElementById(id);
        input.value = 0;
        const feedbackIcon = document.getElementById(id + "FeedbackIcon");
        feedbackIcon.textContent = ''; // Clear the feedback icon
        feedbackIcon.className = ''; // Reset the class
    });
    if (window.innerWidth > 768 && !('ontouchstart' in window || navigator.maxTouchPoints)) {
	document.getElementById('blackChecks').focus();
    }

    // Submit form
    document.getElementById('chessCountForm').addEventListener(
	'submit', submitAnswers);
}

function startNewGame() {
    resetScore();
    loadNewPuzzle();
    startTimer();
}

// Return the event handler that is called when the user clicks to
// submits their answers
function submitAnswers(event) {
    event.preventDefault(); // Prevent the default form submission behavior
    
    let allCorrect = true; // Flag to track if all answers are correct
    ['whiteChecks', 'whiteCaptures', 'blackChecks', 'blackCaptures'].forEach((id) => {
	console.log(`${id}: ${chess_data.correct[id]}`);
	
	const input = document.getElementById(id);
        const inputValue = parseInt(input.value, 10);
        const isCorrect = inputValue === chess_data.correct[id];
        const feedbackIcon = document.getElementById(id+"FeedbackIcon");
	
        feedbackIcon.textContent = isCorrect ? '✓' : '✗'; // Set the icon
        feedbackIcon.className = isCorrect ? 'correct' : 'incorrect'; // Set the class for styling
	
	if (!chess_data.is_correct[id] && isCorrect) {
	    chess_data.is_correct[id] = true;
	    incrementScore(chess_data);
	}
	
	allCorrect = allCorrect && isCorrect;
	if (!isCorrect) {
	    penalizeTime(chess_data)
	}
    });
    
    if (chess_data.is_correct.whiteChecks && chess_data.is_correct.whiteCaptures
	&& chess_data.is_correct.blackChecks && chess_data.is_correct.blackCaptures) {
	loadNewPuzzle();
    }
}


// ----------------------------------------------------------
// Settings dialog box

// Get the modal settings element
var settings = document.getElementById("settingsModal");

// When the user clicks the setting button, open the settings dialog
document.getElementById("settingsButton").onclick = function() {
    settings.style.display = "block";
}

// When the user clicks on the "Save Settings" button, close settings
document.getElementsByClassName("close-button")[0].onclick = function() {
    settigs.style.display = "none";
}

// When the user clicks anywhere outside of the settings dialog, close it
window.onclick = function(event) {
    if (event.target == settings) {
        settings.style.display = "none";
    }
}

function saveSettings() {
    // Timer settings
    const showTimer = document.getElementById('showTimer').checked;
    chess_data.showTimer = showTimer;
    localStorage.setItem('showTimer', showTimer); // Save preference
    setTimerVisibility(showTimer); // Apply preference immediately
    
    settings.style.display = "none"; // Close the settings window
    
    startNewGame();
}

function setTimerVisibility(visible) {
    if (visible) {
	document.getElementById('timerSection').style.display = 'block';
    } else {
	document.getElementById('timerSection').style.display = 'none';
    }
}

// ----------------------------------------------------------
// Load settings

// Load the settings and initialize chess_data
async function loadSettings() {
    chess_data = {
	showTimer: true, // whether the game should be timed
	fen: null, // current position
	correct: null, // stores the correct numbers of counts
	defaultTimeRemaining: 10, // default to 3 min
	timeRemaining: 999, // current time left on clock
	score: 0,
	is_correct: null, // stores which counts are correct
	positions: null, // Array of position strings
	board: null // The board object
    };

    // Timer
    chess_data.showTimer = localStorage.getItem('showTimer') === 'false' ? false : true;
    document.getElementById('showTimer').checked = chess_data.showTimer; // Set the checkbox state
    setTimerVisibility(chess_data.showTimer);
    initTimer();

    // Board
    chess_data.board = Chessboard('board', 'start')
    chess_data.board.flip();

    // Positions
    chess_data.positions = await getPositions();
}


// -----------------------------------------------------------
// Main logic, which depends on loaded positions

(async () => {
    await loadSettings();
    startNewGame();
})();
