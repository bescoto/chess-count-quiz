// -----------------------------------------------------------
// Global variables

let chess_data = null; // See loadSettings for value of chess_data
let pgn_games = []; // Array to store loaded PGN games


// -----------------------------------------------------------
// Chess functions

// Return the number of possible checking moves
function countChecks(game) {
    let checks = 0;
    const moves = game.moves({ verbose: true }); // Get all moves with details

    console.log("Current position:", game.fen()); // Log the current position

    // Temporary game instance to make moves without affecting the original game
    var checkingMoves = moves.filter(move => {
	    let tempGame = new Chess(game.fen());
	    tempGame.move(move);
	    return tempGame.in_check();
    });

    console.log("Checking moves:", checkingMoves.map(move => move.san)); // Log the checking moves
    return { count: checkingMoves.length, moves: checkingMoves.map(move => move.san) };
}

// Return the number of possible capturing moves
function countCaptures(game) {
    // Get all legal moves for the current player
    const moves = game.moves({ verbose: true });
    // Filter the moves to only include captures
    const capturingMoves = moves.filter(move => move.flags.includes('c') || move.flags.includes('e'));
    // Return the number of capturing moves
    return { count: capturingMoves.length, moves: capturingMoves.map(move => move.san) };
}

// Return the total number of moves
function countAllLegal(game) {
    var moves = game.moves({ verbose: true });
    return { count: moves.length, moves: moves.map(move => move.san) };
}

// Return a game where it's the specified player to move ('w' or 'b') from the given FEN
function switchFenSides(fen, side) {
    var fenParts = fen.split(' ');
    fenParts[1] = side;
    return fenParts.join(' ');
}

// Return array of PGN games
async function getGames() {
    const path = 'lichess-puzzles/filtered_games_1.pgn';
    const response = await fetch(path);
    const text = await response.text();
    const games = text.split('\n\n\n'); // Split by double newlines to separate games
    if (games.length <= 0) {
        console.log("Error with PGN file");
    }
    return games;
}

// Get a random position from a random game
function getRandomPosition(games) {
    const randomGameIndex = Math.floor(Math.random() * games.length);
    const game = new Chess();
    const pgn = games[randomGameIndex];
    
    // Parse the PGN
    const parsedGame = game.load_pgn(pgn);
    if (!parsedGame) {
        console.log("Error parsing PGN");
        return null;
    }
    
    // Get a random position from the game
    const moves = game.history();
    
    // Choose a random move number at least 24 moves in and at most 11 moves from end
    const minMove = 24; // This has to be even so we preserve 
    const maxMove = moves.length - 11;
    
    // Determine if we need even or odd move number based on desired player to move
    const needsEven = chess_data.playerToMove === 'w';
    const startNum = needsEven ? 0 : 1;
    
    // Get random even/odd number in our range by stepping by 2
    const possibleMoves = Math.floor((maxMove - minMove) / 2);
    const randomMoveNumber = minMove + (Math.floor(Math.random() * possibleMoves) * 2) + startNum;
    
    // Reset the game and play up to the random move
    game.reset();
    for (let i = 0; i < randomMoveNumber; i++) {
        game.move(moves[i]);
    }
    
    return game.fen();
}

// Return object with correct counts for black and white from given fen
function getCorrectAnswers(fen, questionTypes) {
    return questionTypes.reduce((result, quesType) => {
	result[quesType] = getOneCorrectAnswer(fen, quesType);
	return result;
    }, {});
}

function getOneCorrectAnswer(fen, questionType) {
    let modFen;
    if (questionType.startsWith('p1')) {
	    modFen = fen;
    } else if (questionType.startsWith('p2')) {
	    p2Color = chess_data.playerToMove == 'w' ? 'b' : 'w';
	    modFen = switchFenSides(fen, p2Color)
    } else {
	    throw new RangeError('Expected p1 or p2');
    }

    const game = new Chess();
    game.load(modFen);

    if (questionType.endsWith('Checks')) {
	    return countChecks(game);
    } else if (questionType.endsWith('Captures')) {
	    return countCaptures(game);
    } else if (questionType.endsWith('AllLegal')) {
	    return countAllLegal(game);
    } else {
	    throw new RangeError('Expected Checks or Captures');
    }
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
    updateTimerDisplay(chess_data);
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
    if (confirm(`Time's up! Final Score: ${chess_data.score}`)) {
	startNewGame();
    }
}


// ------------------------------------------------------------
// Code to show the moves when the user clicks the "Show Moves button"

// Function to show moves and disable the button
function showMoves() {
    var showMovesButton = document.getElementById("showMovesButton");
    showMovesButton.disabled = true;
    showMovesButton.style.backgroundColor = "#d3d3d3"; // Grey out the button

    chess_data.questionTypes.forEach((id) => {
	const shownMovesLabel = document.getElementById(id + "ShownMoves");
	shownMovesLabel.textContent = chess_data.correct[id].moves;
    });
}

// Add event listener to the button
document.getElementById("showMovesButton").addEventListener("click", showMoves);


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
    chess_data.fen = getRandomPosition(chess_data.games);
    if (!chess_data.fen) {
        console.log("Error getting position from PGN");
        return;
    }
    chess_data.board.position(chess_data.fen);
    chess_data.correct = getCorrectAnswers(chess_data.fen, chess_data.questionTypes);

    // Initialize all answers to start as false
    chess_data.is_correct = Object.fromEntries(
        chess_data.questionTypes.map(name => [name, false])
    );

    console.log(chess_data);
    
    chess_data.questionTypes.forEach((id) => {
        const input = document.getElementById(id);
        input.value = 0;
        const feedbackIcon = document.getElementById(id + "FeedbackIcon");
        feedbackIcon.textContent = ''; // Clear the feedback icon
        feedbackIcon.className = ''; // Reset the class
        const shownMovesLabel = document.getElementById(id + "ShownMoves");
        shownMovesLabel.textContent = ''; // Clear the shown moves list
    });
    
    if (window.innerWidth > 768 && !('ontouchstart' in window || navigator.maxTouchPoints)) {
        document.getElementById(chess_data.questionTypes[0]).focus();
    }

    const showMovesButton = document.getElementById("showMovesButton");
    showMovesButton.disabled = false;
    showMovesButton.style.backgroundColor = "";    
    
    // Add submit form listener
    document.getElementById('chessCountForm').addEventListener('submit', submitAnswers);
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
    chess_data.questionTypes.forEach((id) => {
	const input = document.getElementById(id);
        const inputValue = parseInt(input.value, 10);
        const isCorrect = inputValue === chess_data.correct[id].count;
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
    
    const all_correct = Object.values(chess_data.is_correct).reduce((acc, cur) => acc && cur, true);
    if (all_correct) {
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
    settings.style.display = "none";
}

// When the user clicks anywhere outside of the settings dialog, close it
window.onclick = function(event) {
    if (event.target == settings) {
        settings.style.display = "none";
    }
}

async function saveSettings() {
    // Timer settings
    const showTimer = document.getElementById('showTimer').checked;
    chess_data.showTimer = showTimer;
    localStorage.setItem('showTimer', showTimer); // Save preference
    setTimerVisibility(showTimer); // Apply preference immediately
    
    // Player to move
    const selectedToMove = document.querySelector('input[name="playerToMove"]:checked');
    localStorage.setItem('selectedToMove', selectedToMove.value); // Save preference
    setPlayerToMove(selectedToMove.value);

    // Set positions and board
    chess_data.games = await getGames();
    setBoard();
    
    // Which count questions are asked
    const questionCheckboxes = document.querySelectorAll('input[name="quizOption"]:checked');
    chess_data.questionTypes = Array.from(questionCheckboxes).map(opt => opt.value);
    localStorage.setItem('questionTypes', JSON.stringify(chess_data.questionTypes)); // Save preference
    createDynamicInputs(chess_data.questionTypes);
    
    // Save ply ahead setting
    const plyAhead = parseInt(document.getElementById('plyAhead').value);
    chess_data.plyAhead = plyAhead;
    localStorage.setItem('plyAhead', plyAhead);
    
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
        defaultTimeRemaining: 180, // default to 3 min
        timeRemaining: 999, // current time left on clock
        score: 0,
        is_correct: null, // stores which counts are correct
        games: null, // Array of PGN games
        board: null, // The board object
        questionTypes: null, // Array of questions, as strings, to ask the user
        plyAhead: 0  // Number of half-moves ahead to visualize
    };

    // Timer
    chess_data.showTimer = localStorage.getItem('showTimer') === 'false' ? false : true;
    document.getElementById('showTimer').checked = chess_data.showTimer; // Set the checkbox state
    setTimerVisibility(chess_data.showTimer);
    initTimer();

    // Positions and player to move
    var selectedToMove = localStorage.getItem('selectedToMove');
    if (selectedToMove === null || selectedToMove == '') {
        selectedToMove = 'Random';
    }
    console.log(selectedToMove);
    document.querySelector(`input[value="${selectedToMove}"]`).checked = true;
    setPlayerToMove(selectedToMove);
    
    // Load PGN games
    chess_data.games = await getGames();
    setBoard();
    
    // Questions
    const storedTypes = localStorage.getItem('questionTypes');
    if (storedTypes !== null && storedTypes != '') {
        chess_data.questionTypes = JSON.parse(storedTypes)
    } else {
        chess_data.questionTypes = ['p1Checks', 'p1Captures', 'p2Checks', 'p2Captures'];
    }
    // Uncheck each input
    document.querySelectorAll('input[name="quizOption"]').forEach(option => {
        option.checked = false;
    });
    // Check the ones that are enabled
    chess_data.questionTypes.forEach(questionType => {
        document.querySelector(`input[value="${questionType}"]`).checked = true;
    })

    console.log(chess_data.questionTypes);
    createDynamicInputs(chess_data.questionTypes);

    // Plies ahead
    const savedPlyAhead = localStorage.getItem('plyAhead');
    chess_data.plyAhead = savedPlyAhead ? parseInt(savedPlyAhead) : 0;
    document.getElementById('plyAhead').value = chess_data.plyAhead;
}

// Set the player to move
function setPlayerToMove(selected) {
    document.querySelector(`input[value="${selected}"]`).checked = true;
    if (selected == 'White') {
	chess_data.playerToMove = 'w';
    } else if (selected == 'Black') {
	chess_data.playerToMove = 'b';
    } else if (Math.random() < .5) { // last two options are random with probability .5
	chess_data.playerToMove = 'w';
    } else {
	chess_data.playerToMove = 'b';
    }
}

// Initialize the board based on the player to move
function setBoard() {
    chess_data.board = Chessboard('board', 'start');
    if (chess_data.playerToMove == 'b') {
	chess_data.board.flip();
    }
}

// Set the inputs where the user specifies how many possible moves there are
function createDynamicInputs(questionTypes) {
    const elem = document.getElementById('count-inputs');
    elem.innerHTML = ''; // Clear previous inputs

    questionTypes.forEach(questionType => {
	const div = document.createElement('div');
        div.className = 'input-group';

        const label = document.createElement('label');
        const input = document.createElement('input');
        const decrementButton = document.createElement('button');
        const incrementButton = document.createElement('button');
	const feedbackIcon = document.createElement('span');
	const shownMoves = document.createElement('label');
        
        label.textContent = createDynamicInputsLabel(questionType);
        input.type = 'number';
        input.id = questionType;
        input.name = questionType;
        input.min = '0';
        input.required = true;

        decrementButton.textContent = '←';
        decrementButton.type = 'button';
        decrementButton.onclick = () => { if (input.value > 0) input.value--; };
	decrementButton.className = 'decrement';

        incrementButton.textContent = '→';
        incrementButton.type = 'button';
        incrementButton.onclick = () => { input.value++; };
	incrementButton.className = 'increment';
	
        feedbackIcon.className = 'feedbackIcon';
        feedbackIcon.id = `${questionType}FeedbackIcon`;

	shownMoves.className = 'shownMoves';
	shownMoves.id = `${questionType}ShownMoves`;
	
        div.appendChild(label);
        div.appendChild(decrementButton);
        div.appendChild(input);
        div.appendChild(incrementButton);
	div.appendChild(feedbackIcon);
	div.appendChild(shownMoves);
	
	elem.appendChild(div);
    });
}

// Return the label for each input
function createDynamicInputsLabel(questionType) {
    const color = (questionType.startsWith('p1')
		   ? (chess_data.playerToMove == 'b' ? "Black" : "White")
		   : (chess_data.playerToMove == 'b' ? "White" : "Black"))

    var moveType;
    switch (questionType.slice(2)) {
    case "Captures":
	moveType = "Captures";
	break;
    case "Checks":
	moveType = "Checks";
	break;
    case "AllLegal":
	moveType = "Moves";
	break;
    }
	
    return `${color}'s ${moveType}:`;
}

// -----------------------------------------------------------
// Main logic, which depends on loaded positions

(async () => {
    await loadSettings();
    startNewGame();
})();

