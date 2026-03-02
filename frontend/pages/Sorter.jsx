/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelectedPlaylistConstext } from "../src/contexts";
import spotifyLogo from '../src/assets/Spotify_icon.svg'
import "../css/Guesser.css";
import { ReactSearchAutocomplete } from 'react-search-autocomplete'

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function play_song(start_ms, duration) {
  await fetch(`http://127.0.0.1:5000/playback/stop`)
  const response = await fetch(`http://127.0.0.1:5000/playback/` + start_ms + '/' + duration)
  if (response.status === 200) {
    let data = await response.json();
    if (!data.success) {
      alert(data.message)
    }
  }
}

function PlaylistSongCard ({song}) {
  return <div className="playlist-song">
    <div className="playlist-song-nr" >
      <p>{song.nr + 1}</p>
    </div>
    <div className="playlist-song-img">
      <img src={song.image_url}/>
    </div>
    <div className="playlist-song-info">
      <h3>{song.artist} - {song.name}</h3>
    </div>
  </div>
}

function GuessHistoryCard ({guess}) {
  var art1 = guess.artist
  var art2 = ''
  var art3 = ''
  var tit1 = guess.title
  var tit2 = ''
  var tit3 = ''
  if (guess.artist_correct){
    art2 = art1
    art1 = ''
  }
  if (guess.title_correct){
    tit2 = tit1
    tit1 = ''
  }

  if (guess.title_correct & guess.artist_correct){
    art1 = ''
    art2 = ''
    art3 = guess.artist
    tit1 = ''
    tit2 = ''
    tit3 = guess.title
  }
  return <div className="history-guess-entry">
    <p>
      <font color="#FF2626"></font>
      <font color="#71EFA3"></font>
      <font color="#00C1D4"></font>
      <font color="#adadad">{art1}</font>
      <font color="#FFD523">{art2}</font>
      <font color="#66CC66">{art3}</font>
      <font color="#ffffff"> - </font>
      <font color="#adadad">{tit1}</font>
      <font color="#FFD523">{tit2}</font>
      <font color="#66CC66">{tit3}</font>
    </p>
  </div>
}

function Sorter() {
  const start_score = 100
  const skip_cost = -5
  const level_cost = [0, 5, 10, 20, 15, 40, 13]
  const [answerSong, setAnswerSong] = useState({})
  const [autocompleteSongNames, setautocompleteSongNames] = useState([])
  const [prevSong, setPrevSong] = useState('')
  const [playlistName, setPlaylistName] = useState("Loading")
  const [playlistLen, setPlaylistLen] = useState(-1)
  const [localSongs, setLocalSongs] = useState(-1)
  const [guessed, setGuessed] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [score, setScore] = useState(start_score)
  const [totalscore, setTotalscore] = useState(0)
  const [guessHistory, setGuessHistory] = useState([])
  const [levelsPlayed, setLevelsPlayed] = useState([false, false, false, false, false, false, false])
  const [loading, setLoading] = useState(false);
  const {playlistId, selectPlaylist, songs, setSongs} = useSelectedPlaylistConstext()

  const getSongs = async () => {
    const options = { method: "GET" }
    //@app.route("/get_songs/<playlist_id>/<reversed>/<start>/<stop>/")
    const response = await fetch(`http://127.0.0.1:5000/get_songs/` + playlistId + '/' + 0)
    if (response.status === 200) {
      let data = await response.json();
      setSongs(data.songs)
      setPlaylistName(data.name)
      setAnswerSong(data.selected_song)
      setLocalSongs(data.local_songs)
      setPlaylistLen(data.playlist_len)
      setPlaylistName(data.playlist_name)

      var autocompleteItems = []
      for (const i in data.songs){
        const a = {
          id: i,
          name: data.songs[i].artist + ' - ' + data.songs[i].name, 
          description: ''
        }
        autocompleteItems.push(a)
      }

      setautocompleteSongNames(autocompleteItems)
    } 
    else {
      setPlaylistName("Cannot connect to backend")
    }
    setLoading(false)
  }
      
  useEffect(() => {
    setLoading(true)
    getSongs(playlistId);
  }, [])

  async function get_new_song(){
    const response = await fetch(`http://127.0.0.1:5000/select/new`)
    let data = await response.json();
    setPrevSong(answerSong.artist + ' - ' + answerSong.name)
    setAnswerSong(data.selected_song)
    setLevelsPlayed([false, false, false, false, false, false, false])
    var elem = document.getElementById('history-guess');
    elem.scrollTop = elem.scrollHeight;
    //setGuessHistory([])

  }

  async function play_song_with_scores(offset, duration, level){
    if (level_cost.length != levelsPlayed.length){
      alert("Somethings wrong with level costs")}
    if (!levelsPlayed[level]){
      levelsPlayed[level] = true
      if (level == 6){ 
        levelsPlayed[level] = false
      }
      setScore(score => Math.max(score - level_cost[level], 0))
    }
    await play_song(offset, duration)
  }

  async function skip_with_score() {
    get_new_song()
    //setGuessHistory([])
    setSkipped(skipped => skipped + 1)
    
    const hx_entry = {"artist": 'Skipped: ' + answerSong.artist, 'title': answerSong.name, 'artist_correct': false, 'title_correct': false,}
    setGuessHistory(guessHistory =>  [...guessHistory, hx_entry] )  
    setTotalscore((totalscore) => totalscore + skip_cost)
    setScore(score => score = start_score)
  }

  async function make_a_guess(formData) {
    var guess = formData.get("guess");
    const response = await fetch(`http://127.0.0.1:5000/guess/` + guess)
    
    if (response.status === 200) {
      let data = await response.json();
      guess = guess.split('-')
      var artist = ""
      var title = ""
      if (guess.length == 1){
        artist = "Not entered"
        title = guess[0]
      }
      else if (guess.length == 2){
        artist = guess[0]
        title = guess[1]
      }
      else {
        alert("Wrong struct of guess")
        return
      }
      const hx_entry = {"artist": artist, 'title': title, 'artist_correct': data.artist_correct, 'title_correct': data.title_correct,}
      setGuessHistory(guessHistory =>  [...guessHistory, hx_entry] )  
      if (data.correct) {
        setGuessed(guessed => guessed + 1)
        //setGuessHistory({"artist": answerSong.artist, 'title': answerSong.title, 'artist_correct': true, 'title_correct': true,})
        setTotalscore(totalscore => totalscore + score)
        setScore(score => score = start_score)
        get_new_song()
      }
    }
  }

  async function make_a_guess_auto(item) {
    const response = await fetch(`http://127.0.0.1:5000/guess/` + item.name.replace('/',''))
    
    if (response.status === 200) {
      let data = await response.json();
      var guess = item.name.split('-')
      var artist = ""
      var title = ""
      if (guess.length == 1){
        artist = "Not entered"
        title = guess[0]
      }
      else if (guess.length >= 2){
        artist = guess[0]
        title = guess[1]
      }
      const hx_entry = {"artist": artist, 'title': title, 'artist_correct': data.artist_correct, 'title_correct': data.title_correct,}
      setGuessHistory(guessHistory =>  [...guessHistory, hx_entry] )  
      if (data.correct) {
        setGuessed(guessed => guessed + 1)
        
        setTotalscore(totalscore => totalscore + score)
        setScore(score => score = start_score)
        //setGuessHistory({"artist": answerSong.artist, 'title': answerSong.title, 'artist_correct': true, 'title_correct': true,})
        get_new_song()
      }
    }
  }

  return <>
  <div className="sorter-page">
    <div className="left-panel">
      {loading ? (
        <h2>Loading...</h2>
      ) : (
      <div className="guesser-playlist">
        {songs.map((song) => (<PlaylistSongCard key={song.id} song={song} />))}
      </div>
      )}
    </div>



    <div className="main-panel">
      <div className="main-test-buttons">
        <> </>
        <Link to="/" className="nav-link">
          <button> Go back to playlist selection</button>
        </Link>
        <> </>
        <button onClick={() => (setGuessHistory([]))}>
            Clear guesses history
        </button>
      </div>
      <div className="main-guesser">
        <div className="main-guesser-control">
          <h1>Control panel:</h1>
          <p></p>
          <div className="main-guesser-info-scores">
            <div className="main-guesser-info-scores-sub">
              <h2>Score:</h2>
              <h1>{score}</h1>
              <h3>Guessed songs:</h3>
              <h2>{guessed}</h2>
            </div>
            <div className="main-guesser-info-scores-sub"> 
              <h2>Total score:</h2>
              <h1>{totalscore}</h1>
              <h3>Skipped songs:</h3>
              <h2>{skipped}</h2>
            </div>
          </div>
          <p></p>
          <div className="guess-form-auto">
            <ReactSearchAutocomplete
              items={autocompleteSongNames}
              onSelect={make_a_guess_auto}
              styling={{ zIndex: 4 }} // To display it on top of the search box below
              //maxLength={800}
              maxResults={20}
              autoFocus
              className="search"
            />
          </div>
          <p></p>
          <div className="main-guesser-control-button-row">
            <button onClick={() => (play_song_with_scores(0, 0.5, 0))}>
                &#9658; Po jednej nutce
            </button>
            <> </>
            <button onClick={() => (play_song_with_scores(0, 1, 1))}>
                &#9658; Po dwóch
            </button>
            <> </>
            <button onClick={() => (play_song_with_scores(0, 2, 2))}>
                &#9658; Po sekundzie
            </button>
            <> </>
            <button onClick={() => (play_song_with_scores(0, 4, 3))}>
                &#9658; Po 3 s
            </button>
            <> </>
          </div>
          <> </>
          <div className="main-guesser-control-button-row">
            <button onClick={() => (play_song_with_scores(60000, 2, 4))}>
                &#9658; Od środka (1 s na 1:00)
            </button>
            <> </>
            <button onClick={() => (play_song_with_scores(0, 0, 5))}>
                &#9658; Play nonstop
            </button>
            <> </>
            <button onClick={() => (play_song_with_scores(getRandomInt(answerSong.duration), 2, 6))}>
                &#9658; Play random 1 s
            </button>
            <> </>
          </div>
          <p></p>
          <div className="main-guesser-control-button-row">
            <button onClick={() => (fetch(`http://127.0.0.1:5000/playback/stop`))}>
                &#9208; Pause
            </button>
            <> </>
            <button onClick={() => (skip_with_score())}>
                &#9658; &#9658; Skip 
            </button>
            <> </>
          </div>
          <p></p>
          <div className="guess-form">
            <form action={make_a_guess}>
              <input name="guess" className="guess-form-input" />
              <button type="submit" className="guess-form-button">Guess</button>
            </form>
          </div>
          <p></p>
        </div>
        <div className="main-guesser-info">
          <h1>Info:</h1>
          <p></p>
          <h3>Previous song:</h3>
          <h3>{prevSong}</h3>
          <p></p>
          <div className="main-guesser-info-history">
            <h3>Guess history:</h3>
            <div className="history-guess">
              {guessHistory.toReversed().map((guess) => (<GuessHistoryCard key={guess.title} guess={guess} />))}
            </div>
          </div>
        </div>
      </div>
    </div>



    <div className="right-panel">
      <div className="right-panel-home-logos">
        <a href="https://www.youtube.com/watch?v=7WF0KGtiETU" target="_blank">
          <img src={spotifyLogo} className="logo spotify" alt="Spotify logo" width="64" height="64"/>
        </a>
      </div>
      <h2>Playlist info:</h2>
      <h3>{playlistName}</h3>
      <p>{playlistLen} Songs</p>
      <h3></h3>
      <h2>Instruction:</h2>
      <p>Żaby zaliczyło odpowiedź musi być ona w fomacie:</p>
      <p>artysta - tytuł piosenki</p>
      <p>Strzał może być samym tytułem ale musi być wpisany bezbłędnie</p>
      <p>Znaki specjalnie i większość gówna ( - remaster / - single veriosn) są pomijane</p>
      <p>Strzał może zawierać rozsądną liczbę literówek</p>
      <p>Niektóre skróty naz zespołów są ok. (brhg, ironsi)</p>
      <p>max jeden myślnik w strzale</p>
      <p>Użycie po raz pierwszy funkcji innej niż po jedej odejmuje punkty tylko raz. Potem już można powtarzać za free</p>
      <p>Wyjątkiem jest random, który zawsze kosztuje {level_cost.at(-1)}</p>
      <p>Nie ma ujemnych punktów poza skippowaniem, które kosztuje: {skip_cost}</p>
      <h2>Debug</h2>
      <p>Playlist ID:</p>
      <p>{playlistId}</p>
      <h5></h5>
      <p># skipped local songs: {localSongs}</p>
    </div>
  </div>
  </>
}

export default Sorter;
