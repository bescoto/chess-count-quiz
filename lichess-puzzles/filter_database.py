#!/usr/bin/env python3

## This file filters chess games from a Lichess database based on player ratings, game length, and time control. 
## It extracts games between 1500-1700 rated players that last at least 25 moves, excluding bullet games.
## The output is used by the chess count quiz app.

import zstandard as zstd
import io
import chess
import chess.pgn
import json

# Settings
input_filename = "lichess_db_standard_rated_2016-01.pgn.zst"
output_filename_base = "selected_games"
output_stats_fn_base = "selected_stats"
games_per_file = 500
total_games = 2000

def get_filtered_games():
    """
    Open the game database and return 2000 filtered games
    """
    filtered_games = []

    # Open and decompress the .zst file
    with open(input_filename, 'rb') as compressed:
        dctx = zstd.ZstdDecompressor()

        with dctx.stream_reader(compressed) as reader:
            # Wrap the reader in a TextIOWrapper for decoding
            text_stream = io.TextIOWrapper(reader, encoding='utf-8')
        
            # Loop over each game in the PGN file
            while True:
                game = chess.pgn.read_game(text_stream)
                if game is None:
                    break  # End of file reached
                
                # Get time control and check if it's bullet
                time_control = game.headers.get("TimeControl", "")
                if time_control.startswith("60") or time_control.startswith("120"):
                    # 1+0 or 2+0; Skip bullet games
                    continue
                
                # Get ratings for white and black
                try:
                    white_rating = int(game.headers.get("WhiteElo", "0"))
                    black_rating = int(game.headers.get("BlackElo", "0"))
                except ValueError:
                    continue  # Skip if ratings are missing or invalid
                
                # Filter for ratings between 1500 and 1700 (both players)
                if not (1500 <= white_rating <= 1700 and 1500 <= black_rating <= 1700):
                    continue
            
                # Count the number of moves played in the game
                move_count = 0
                node = game
                while node.variations:
                    node = node.variations[0]
                    move_count += 1
                # Check that the game lasts at least a certain number moves/plies
                if move_count < 20 * 2:
                    continue
                    
                # If all filters pass, add the game to the list
                filtered_games.append(game)
                if len(filtered_games) >= total_games:
                    break
                
    return filtered_games

class PlyStats:
    """Hold some stats on the current ply of game

    checks and captures indicate how many different moves, from the
    current position, there are that would result in a check or
    capture.

    """
    def __init__(self):
        self.checks = 0
        self.captures = 0
        self.in_check = False
        self.castling_rights = False
        self.en_passant_rights = False
            
def get_game_stats(game, start_ply=20, end_ply=100):
    """
    Returns dictionary of stats for the given game ply_index -> PlyStats object
    """
    board = game.board()
    ply_index = 0
    node = game

    result = {}
    
    while node.variations:
        move = node.variation(0).move
        board.push(move)
        ply_index += 1

        if start_ply <= ply_index <= end_ply:
            is_white = board.turn == chess.BLACK  # Because the move has just been made

        stats = PlyStats()

        # Count legal moves that would result in check
        for legal_move in board.legal_moves:
            board_copy = board.copy()
            board_copy.push(legal_move)
            if board_copy.is_check():
                stats.checks += 1
            if board.is_capture(legal_move):
                stats.captures += 1
                
        if (board.has_castling_rights(chess.WHITE) or
            board.has_castling_rights(chess.BLACK)): 
            stats.castling_rights = True
        if board.ep_square is not None:
            stats.en_passant_rights = True
        stats.in_check = board.is_check()
            
        result[ply_index] = stats
        node = node.variations[0]

    return result

def write_games(filtered_games):
    """
    Write output to disk in 4 separate files
    """
    for file_num in range(1, 5):
        start_idx = (file_num - 1) * games_per_file
        end_idx = file_num * games_per_file
        file_games = filtered_games[start_idx:end_idx]
         
        output_filename = f"{output_filename_base}_{file_num}.pgn"
        with open(output_filename, "w", encoding="utf-8") as outfile:
            for game in file_games:
                exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
                pgn_text = game.accept(exporter)
                outfile.write(pgn_text + "\n\n")
    
        print(f"Extracted {len(file_games)} games and saved to {output_filename}")

def write_game_stats(game_stats):
    for file_num in range(1, 5):
        start_idx = (file_num - 1) * games_per_file
        end_idx = file_num * games_per_file
        file_stats = game_stats[start_idx:end_idx]

        d = {k: game_stats[k] for k in range(start_idx, end_idx)}
        
        output_filename = f"{output_stats_fn_base}_{file_num}.pgn"
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(d, f, indent=2)
    assert len(game_stats) == 4 * games_per_file
    print(f"Saved {len(game_stats)} to {output_filename}")
            
filtered_games = get_filtered_games()
print("Filtered games downloaded")

write_games(filtered_games)
print("Games written")

game_stats = get_game_stats()
print("Game stats computed")

write_stats(game_stats)

print(f"Total games processed: {len(filtered_games)}")



