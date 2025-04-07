#!/usr/bin/env python3

## This file filters chess games from a Lichess database based on player ratings, game length, and time control. 
## It extracts games between 1500-1700 rated players that last at least 25 moves, excluding bullet games.
## The output is used by the chess count quiz app.

import zstandard as zstd
import io
import chess.pgn

# Settings
input_filename = "lichess_db_standard_rated_2016-01.pgn.zst"
output_filename_base = "filtered_games"
games_per_file = 500
total_games = 2000

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
            if time_control.startswith("60") or time_control.startswith("120"):  # 1+0 or 2+0
                continue  # Skip bullet games
            
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
            
            # Check that the game lasts at least 25 moves (full moves)
            if move_count < 25:
                continue
            
            # If all filters pass, add the game to the list
            filtered_games.append(game)
            if len(filtered_games) >= total_games:
                break

# Write the filtered games to multiple files
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

print(f"Total games processed: {len(filtered_games)}")