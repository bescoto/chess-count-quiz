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
    console.log(positions);
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

// Load a new puzzle and reset inputs
function loadNewPuzzle(board, positions, chess_data) {
    chess_data.fen = getRandomPosition(positions);
    board.position(chess_data.fen);
    chess_data.correct = getCorrectAnswers(chess_data.fen);

    console.log(chess_data);
    
    document.querySelectorAll('#chessCountForm input[type="number"]').forEach(input => {
        input.value = ''; // Clear the input
        const feedbackIcon = input.nextElementSibling;
        feedbackIcon.textContent = ''; // Clear the feedback icon
        feedbackIcon.className = ''; // Reset the class
    });
}

// The main logic that depends on loaded positions
(async () => {
    var board = Chessboard('board', 'start')
    const positions = await getPositions();
    const chess_data = { fen: null, correct: null };
    loadNewPuzzle(board, positions, chess_data);
    
    // Do this when the user submits answers
    document.getElementById('chessCountForm').addEventListener('submit', function(event) {
	event.preventDefault(); // Prevent the default form submission behavior

	let allCorrect = true; // Flag to track if all answers are correct
	['whiteChecks', 'whiteCaptures', 'blackChecks', 'blackCaptures'].forEach((id) => {
	    console.log(`${id}: ${chess_data.correct[id]}`);
	    
	    const input = document.getElementById(id);
            const inputValue = parseInt(input.value, 10);
            const isCorrect = inputValue === chess_data.correct[id];
            const feedbackIcon = input.nextElementSibling; // Assumes the span for the icon is right after the input
	    
            feedbackIcon.textContent = isCorrect ? '✓' : '✗'; // Set the icon
            feedbackIcon.className = isCorrect ? 'correct' : 'incorrect'; // Set the class for styling

	    allCorrect = allCorrect && isCorrect; 
	});

	if (allCorrect) {
	    loadNewPuzzle(board, positions, chess_data);
	}
    });
})();


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('whiteChecks').focus();
});

//	    input.value = ''; // Clear the input
