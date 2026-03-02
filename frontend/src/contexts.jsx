/* eslint-disable react-refresh/only-export-components */
 
import {createContext, useState, useContext} from "react"

const SelectedPlaylistContext = createContext()

export const useSelectedPlaylistConstext = () => useContext(SelectedPlaylistContext)

export const SelectedPlaylistProvider = ({children}) => {
    
    const [playlistId, setSelectedPlaylistId] = useState('6GZTtVOg1dyKql649pWh1V')  //'6cmx5OqOJjbRrZjr6HzkF1' - test; '6GZTtVOg1dyKql649pWh1V' - top of de top ksi;
    const [playlists, setPlaylists] = useState([])
    const [songs, setSongs] = useState([])

    const selectPlaylist = (id) => {
        setSelectedPlaylistId(id)
    }

    /*const savePlaylists = (playlists) => {
        setPlaylists(playlists)
    }*/

    const value = {
        playlistId,
        selectPlaylist,
        playlists,
        setPlaylists,
        songs,
        setSongs
    }

    return <SelectedPlaylistContext.Provider value={value}>
        {children}
    </SelectedPlaylistContext.Provider>
}