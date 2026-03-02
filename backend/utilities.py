import random
import string
import os
from flask import jsonify

def get_songs_from_playlist(spotify, playlist_id):
    response = spotify.playlist(playlist_id)
    playlist_name = response['name']
    playlist_len = response['tracks']['total']
    track_list = response['tracks']['items']
    response = response['tracks']
    while response['next']:
        response = spotify.next(response)
        track_list.extend(response['items'])

    songs = []
    local_songs = 0

    for i, song in enumerate(track_list):

        s = {'nr': i, 'id': song['track']['id'], 'name': song['track']['name']}
        s['artist'] = song['track']['artists'][0]['name']
        s['artist_id'] = song['track']['artists'][0]['id']
        s['image_url'] = None
        s['duration'] = song['track']['duration_ms']
        
        if song['track']['is_local']:
            local_songs = local_songs + 1
            s['id'] = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(11))   # spotify - 22
            continue
        if song['track']['album']['images']:
            s['image_url'] = song['track']['album']['images'][0]['url']
        
        songs.append(s)

    return songs, local_songs, playlist_len, playlist_name


def get_playlists(spotify):
    """
    Gets all playlist ids from my spotify library
    """
    response = spotify.user_playlists((spotify.me())['id'])
    playlists = response['items']
    while response['next']:
        response = spotify.next(response)
        playlists.extend(response['items'])
    
    playlists_dict = []

    for i, playlist in enumerate(playlists):
        pl = {'i': i + 1, 'id': playlist['id'], 'name': playlist['name']}
        pl['owner'] = playlist['owner']['display_name']
        pl['len'] = playlist['tracks']['total']
        pl['image_url'] = None
        if playlist['images']:
            pl['image_url'] = playlist['images'][0]['url']
        playlists_dict.append(pl)
    #print(f'Playlist {playlist_name} has {playlist["tracks"]["total"]} tracks.')
    #print(f'Number of playlists on Spotify: {response["total"]}')
    return playlists_dict



"""
OUTDATED AND TO BE REMOVED:
"""

def dump_old_top_by_artist(spotify):
    songs, local_songs, playlist_len, playlist_name = get_songs_from_playlist(spotify, "0AwOdQZaWhm5uXrE507LHg")
    artists = {}
    for song in songs:
        artist_name = song['artist']
        if artist_name in artists:
            artists[artist_name].append({'nr': song['nr'], 'name': song['name']})
        else:
            artists[artist_name] = [{'nr': song['nr'], 'name': song['name']}]

    
    for artist in sorted(artists, key=lambda x: -len(artists[x])):
        print(artist)
        if len(artists[artist]) < 2:
            continue
        for s in artists[artist]:
            print(s['nr'], s['name'])
        print('\n')


def generate_must_have(spotify, Database):
    songs, local_songs, playlist_len, playlist_name = get_songs_from_playlist(spotify, "6cmx5OqOJjbRrZjr6HzkF1")

    SelectHistory = Database['SelectHistory']
    with open("must_have_history.txt", "w", encoding='utf-8') as f:
        with open("must_have_history_names.txt", "w", encoding='utf-8') as fn:
            f.write('')
            fn.write('')
            for i, song in enumerate(songs):
                if song['artist'] == songs[i - 1]['artist']:
                    f.write(f"{song['id']}\t{songs[i - 1]['id']}\n")
                    fn.write(f"{song['name']}\t{songs[i - 1]['name']}\n")
    #reorder_playlist(spotify, Database['playlist_id'], Database['songs'])
    #print(f'Saved history len: {len(SelectHistory)}')
    return jsonify({'message': "History saved successfully."})


def compare_new_old(spotify):
    import re
    songs_old_arr, local_songs, playlist_len, playlist_name = get_songs_from_playlist(spotify, "0AwOdQZaWhm5uXrE507LHg")
    songs_new_arr, local_songs, playlist_len, playlist_name = get_songs_from_playlist(spotify, "6GZTtVOg1dyKql649pWh1V")

    songs = {}
    songs = {}
    songs_new_names = [song['name'] for song in songs_new_arr]
    songs_old_names = [song['name'] for song in songs_old_arr]
    
    for song in songs_new_arr:
        if song['name'] not in songs:
            songs[song['name']] = song
        songs[song['name']]['position_new'] = song['nr'] + 1
        songs[song['name']]['position_old'] = 0
        songs[song['name']]['in_new'] = True
        if song['name'] in songs_old_names:
            songs[song['name']]['in_old'] = True
        else:
            songs[song['name']]['in_old'] = False


    for song in songs_old_arr:
        if song['name'] not in songs:
            songs[song['name']] = song
        songs[song['name']]['position_old'] = song['nr'] + 1
        if 'position_new' not in songs[song['name']]:
            songs[song['name']]['position_new'] = 0

        songs[song['name']]['in_old'] = True
        if song['name'] in songs_new_names:
            songs[song['name']]['in_new'] = True
        else:
            songs[song['name']]['in_new'] = False
    

    with open('comparsion.txt', "w", encoding='utf-8') as f:
            f.write('')
            f.write(f'Title,Position new,Positionj old,in_new,in_old,change,Artist\n')
            for song in songs.values():
                change = 500
                if song['position_old'] and not song['position_new']:
                    change = -500
                if song['position_old'] and song['position_new']:
                    change = song['position_old'] - song['position_new']
                name = re.sub(',', ' ', song['name'])
                f.write(f"{name},{song['position_new']},{song['position_old']},{song['in_new']},{song['in_old']},{change},{song['artist']}")
                f.write('\n')
