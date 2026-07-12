import { create } from "zustand";

export interface SongData {
  _id: string;
  title: string;
  artist: string;
  youtubeVideoId: string;
}

interface AudioPlayerStore {
  currentSong: SongData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playerInstance: any;
  setPlayerInstance: (instance: any) => void;
  playSong: (song: SongData) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  setVolume: (vol: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  setIsPlaying: (playing: boolean) => void;
  seek: (seconds: number) => void;
  stopSong: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80, // default volume percent
  playerInstance: null,

  setPlayerInstance: (instance) => set({ playerInstance: instance }),

  playSong: (song) => {
    const { playerInstance, volume } = get();
    set({ currentSong: song, isPlaying: true, currentTime: 0, duration: 0 });
    
    if (playerInstance && playerInstance.loadVideoById) {
      playerInstance.loadVideoById(song.youtubeVideoId);
      playerInstance.setVolume(volume);
      playerInstance.playVideo();
    }
  },

  pauseSong: () => {
    const { playerInstance } = get();
    set({ isPlaying: false });
    if (playerInstance && playerInstance.pauseVideo) {
      playerInstance.pauseVideo();
    }
  },

  resumeSong: () => {
    const { playerInstance } = get();
    set({ isPlaying: true });
    if (playerInstance && playerInstance.playVideo) {
      playerInstance.playVideo();
    }
  },

  setVolume: (vol) => {
    const { playerInstance } = get();
    set({ volume: vol });
    if (playerInstance && playerInstance.setVolume) {
      playerInstance.setVolume(vol);
    }
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  seek: (seconds) => {
    const { playerInstance } = get();
    set({ currentTime: seconds });
    if (playerInstance && playerInstance.seekTo) {
      playerInstance.seekTo(seconds, true);
    }
  },

  stopSong: () => {
    const { playerInstance } = get();
    set({ currentSong: null, isPlaying: false, currentTime: 0, duration: 0 });
    if (playerInstance && playerInstance.stopVideo) {
      playerInstance.stopVideo();
    }
  },
}));
