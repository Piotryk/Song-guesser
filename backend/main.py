from flask_cors import CORS
from flask import Flask, request, jsonify, session, redirect
import random
import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from config import SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, SPOTIPY_CLIENT_URL, SCOPE_MASTER
import utilities
import json
import time
import asyncio
import re
from jellyfish import damerau_levenshtein_distance
import unidecode

'''
To run frontend:
cmd -> cd frontend
npm run dev

npm run --prefix frontend dev

To run backend:
python ./backend/main.py
'''

"""
TODO:
Remove selected song from to_guess while 
"""


if __name__ == '__main__':
    app = Flask(__name__)
    app.config['CORS_HEADERS'] = "Content-Type"
    app.config['PROPAGATE_EXCEPTIONS'] = True
    cors = CORS(app)
    spotify = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id=SPOTIPY_CLIENT_ID,
                                                        client_secret=SPOTIPY_CLIENT_SECRET,
                                                        redirect_uri=SPOTIPY_CLIENT_URL,
                                                        scope=SCOPE_MASTER))
    
    Database = {'songs': [],  "playlist_id": None, "playlist_name": None, "selected_song": "", "to_guess": {}}
    history_filename = 'history.txt'
    artist_abbreviations = json.load( open("abbreviations.json"))
    
    
    def select_random_song():
        #Database['selected_song'] = random.choice(Database['to_guess'])
        if len(Database['to_guess']) < 1:
            Database['to_guess'] = Database['songs']
        rand_index = random.randint(0, (len(Database['to_guess']) - 1))
        Database['selected_song'] = Database['to_guess'][rand_index]
        del Database['to_guess'][rand_index]
        #Database['selected_song'] = random.choice(Database['songs'])
        #print(type(Database['selected_song']))
        print(Database['selected_song'])
        #TODO: Remove selected song from to_guess
    

    @app.route("/get_playlists")
    def get_playlists_home():
        return jsonify({'message': "Success.", 'playlists':utilities.get_playlists(spotify)})


    @app.route("/get_songs/<playlist_id>/<reversed>")
    def get_songs_for_sorter(playlist_id, reversed):
        reversed = int(reversed)
        songs, local_songs, playlist_len, playlist_name = utilities.get_songs_from_playlist(spotify, playlist_id)
        if len(songs) < 2:
            print('Playlist too short! Crash imminent!')
        if reversed:
            songs.reverse()

        Database['songs'] = songs
        Database['to_guess'] = songs.copy()
        Database['playlist_id'] = playlist_id
        Database['playlist_name'] = playlist_name
        select_random_song()

        return jsonify({'message': "Success.", 'local_songs': local_songs, 'songs':songs, 'playlist_len': playlist_len, 'playlist_name': playlist_name, 'selected_song': Database['selected_song']})

    
    #@app.route("/playback/<song_id>/<playlistId>/<offset>/<duration>")
    #def playback_start(song_id, playlistId,  offset, duration):
    @app.route("/playback/<offset>/<duration>")
    def playback_start(offset, duration):
        uri = "spotify:track:" + Database['selected_song']['id']
        playlist_uri = "spotify:playlist:" + Database['playlist_id']
        duration = float(duration)
        offset = float(offset)

        if Database['selected_song']['duration'] < offset:
            return jsonify({'success': False, 'message': "Offset larger than duration."})

        try:
            spotify.start_playback(context_uri=playlist_uri, offset={'uri': uri}, position_ms=offset)
            if duration > 0:
                time.sleep(float(duration))
                #asyncio.sleep(duration)
                spotify.pause_playback()
        except:
            return jsonify({'success': False, 'message': "Cannot play a song. Check if you have Spotify opened and start any song."})
        
        return jsonify({'success': True, 'message': "Success."})
    

    @app.route("/playback/stop")
    def playback_pause():
        try:
            spotify.pause_playback()
            return jsonify({'message': "Playback paused."})
        except:
            return jsonify({'message': "Playback was already stopped."})
        
    
    @app.route("/select/new")
    def selenct_new_song_route():
        select_random_song()
        return jsonify({'message': "Success", 'selected_song': Database['selected_song']})
        

    def sanitaze(text: str):
        text = text.lower()
        text = unidecode.unidecode(text)
        text = re.sub(" the ", "", text)
        text = re.sub("^the ", "", text)
        text = re.sub(" a ", "", text)
        text = re.sub("^a ", "", text)
        text = re.sub(" an ", "", text)
        text = re.sub("^an ", "", text)
        text = re.sub('-.*', '', text)        # Removes ' - Remastered' and similar things from title
        text = re.sub(" metal cover.*", "", text)
        text = re.sub(" remaster.*", "", text)
        text = re.sub('[fF]eat.*', '', text)
        text = ''.join(c for c in text if c.isalnum())
        return text

        
    @app.route("/guess/<name>")
    def check_guess(name):
        #Pre-check
        guess = name.split('-')
        if len(guess) < 1:
            return jsonify({'correct': False, 'message': "That's not it"})
    
        if len(guess) == 1:
            guess = ['', guess[0]]

        if len(guess) > 2:
            print(f"Somethings wrong with the guess. {guess}")

        #Simplify input
        guessed_artist = sanitaze(guess[0])
        guessed_title = sanitaze(guess[1])

        selected_title = sanitaze(Database['selected_song']['name'])
        selected_artist = sanitaze(Database['selected_song']['artist'])
        if selected_artist in artist_abbreviations:
            selected_artist = sanitaze(artist_abbreviations[selected_artist])

        # Check similarity
        min_part_for_in_check = 0.5 
        min_len_for_in_check = 8
        dl_thr = 0.25
        flag_correct_artist = False
        flag_correct_title = False

        if guessed_artist == selected_artist:
            flag_correct_artist = True

        if len(guessed_artist) > min_part_for_in_check * len(selected_artist) and len(selected_artist) > min_len_for_in_check:
            if guessed_artist in selected_artist or selected_artist in guessed_artist:
                flag_correct_artist = True

        if damerau_levenshtein_distance(guessed_artist, selected_artist) < dl_thr * min(len(guessed_artist),len(selected_artist)):
            flag_correct_artist = True


        if guessed_title == selected_title:
            flag_correct_title = True
            if len(guessed_artist) == 0:
                flag_correct_artist = True

        if len(guessed_title) > min_part_for_in_check * len(selected_title) and len(selected_title) > min_len_for_in_check:
            if guessed_title in selected_title or selected_title in guessed_title:
                flag_correct_title = True

        if damerau_levenshtein_distance(guessed_title, selected_title) < dl_thr * min(len(guessed_title),len(selected_title)):
            flag_correct_title = True

        #Debug
        print(f"Guess artist: {guessed_artist}\t\tDL distance: {damerau_levenshtein_distance(guessed_artist, selected_artist)}")
        print(f"Selec artist: {selected_artist}\t\tDL distance: {damerau_levenshtein_distance(guessed_artist, selected_artist)}")
        print(f"Guess title: {guessed_title}\t\tDL distanec: {damerau_levenshtein_distance(guessed_title, selected_title)}")
        print(f"Selec title: {selected_title}\t\tDL distanec: {damerau_levenshtein_distance(guessed_title, selected_title)}")

        #Result
        if flag_correct_artist and flag_correct_title:
            print(f"Guessed")
            return jsonify({'correct': True, 'message': "Success.", 'artist_correct': flag_correct_artist, 'title_correct': flag_correct_title})
        else:
            return jsonify({'correct': False, 'message': "That's not it", 'artist_correct': flag_correct_artist, 'title_correct': flag_correct_title})
        

    app.run(debug=True)
   