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

// Grab a random FEN from the FEN text file
function getRandomPosition(positions) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    return positions[randomIndex];
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

// Return object with correct answers from given fen
function getCorrectAnswers(fen) {
    white_to_move = colorToMove(fen, 'w');
    black_to_move = colorToMove(fen, 'b');
    const correctAnswers = {
	whiteChecks: countChecks(white_to_move),
	blackChecks: countChecks(black_to_move),
	whiteCaptures: countCaptures(white_to_move),
	blackCaptures: countCaptures(black_to_move)
    };
    console.log(correctAnswers);
    return correctAnswers;
}

// The main logic that depends on loaded positions
(async () => {
    var game = new Chess();
    const positions = await getPositions();
    const fen = getRandomPosition(positions);
    // Example: const fen = '5rk1/pp6/3q3p/2pP2pB/2P5/4Q1P1/PP4PK/8 w - - 8 31';

    // Count checks and captures for white and black
    correctAnswers = getCorrectAnswers(fen);
    var board = Chessboard('board', {
	position: fen
    });

    // Do this when the user submits answers
    document.getElementById('chessCountForm').addEventListener('submit', function(event) {
	event.preventDefault(); // Prevent the default form submission behavior
	
	// Iterate over each input to check answers and display feedback
	['whiteChecks', 'blackChecks', 'whiteCaptures', 'blackCaptures'].forEach((id) => {
	    console.log(`${id}: ${correctAnswers[id]}`);
	    
	    const input = document.getElementById(id);
            const inputValue = parseInt(input.value, 10);
            const isCorrect = inputValue === correctAnswers[id];
            const feedbackIcon = input.nextElementSibling; // Assumes the span for the icon is right after the input
	    
            feedbackIcon.textContent = isCorrect ? '✓' : '✗'; // Set the icon
            feedbackIcon.className = isCorrect ? 'correct' : 'incorrect'; // Set the class for styling
	});
    });
})();


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('whiteChecks').focus();
});

//	    input.value = ''; // Clear the input
