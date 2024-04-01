###########################################################################
## Filter the puzzles and build two files (one for white, one for black)

import csv
import chess

# Function to check if a position is in check
def is_in_check(fen):
    board = chess.Board(fen)
    return board.is_check()

# Retuns True if it's white's turn
def white_to_move(fen):
    parts = fen.split()
    if parts[1] == 'w':
        return True
    assert parts[1] == 'b'
    return False
            
# Read the CSV file and filter positions
def filter_positions(csv_filepath):
    white_positions = []
    black_positions = []
    i = 0
    with open(csv_filepath, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            fen = row['FEN']
            rating = float(row['Rating'])
            if not is_in_check(fen) and 1400 < rating < 1800:
                if white_to_move(fen):
                    white_positions.append(fen)
                else:
                    black_positions.append(fen)
            print(i)
            i += 1
    return (white_positions, black_positions)

# Write the filtered positions to a text file
def write_positions_to_file(positions, output_filepath):
    with open(output_filepath, 'w') as file:
        for position in positions:
            file.write(position + '\n')

# Example usage
csv_filepath = 'lichess_db_puzzle.csv' ## downloaded from the Lichess website
white_positions, black_positions = filter_positions(csv_filepath)
write_positions_to_file(white_positions, 'white_positions.txt')
write_positions_to_file(black_positions, 'black_positions.txt')


