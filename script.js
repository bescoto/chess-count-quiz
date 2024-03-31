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

var game = new Chess();
// const fen = '5rk1/pp6/3q3p/2pP2pB/2P5/4Q1P1/PP4PK/8 w - - 8 31';
// const fen = '8/1R6/2P1q2k/2Ppnp2/6pr/4P3/2Q1BP1P/6K1 b - - 0 37';
const fen = 'rnb1k2r/ppq2ppp/4pn2/8/2B5/1N2PNP1/PP3PP1/R2QK2R b KQkq - 0 11'
white_to_move = colorToMove(fen, 'w');
black_to_move = colorToMove(fen, 'b');

// Count checks for white and black
const checksForWhite = countChecks(white_to_move);
const checksForBlack = countChecks(black_to_move);
// Count captures for white and black
const capturesForWhite = countCaptures(white_to_move);
const capturesForBlack = countCaptures(black_to_move);

var board = Chessboard('board', {
    position: fen
});

console.log(`Checks for White: ${checksForWhite}`);
console.log(`Checks for Black: ${checksForBlack}`);
console.log(`Captures for White: ${capturesForWhite}`);
console.log(`Captures for Black: ${capturesForBlack}`);

