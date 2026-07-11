"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Heart, Award, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<"tictactoe" | "memory" | null>(null);

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Gamepad2 className="w-8 h-8 text-primary" /> Cozy Games
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Play simple, lighthearted games together while you are apart 🌸
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!activeGame ? (
          /* Selection Screen */
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mx-auto"
          >
            {/* Tic-Tac-Toe Card */}
            <motion.div
              onClick={() => setActiveGame("tictactoe")}
              className="card-cozy p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-4 hover:border-primary transition-all duration-200"
              whileHover={{ y: -6, scale: 1.01 }}
            >
              <span className="text-5xl">❤️</span>
              <div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Tic-Tac-Love</h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
                  A romantic spin on the classic Tic-Tac-Toe using hearts and flowers. Take turns on the same screen!
                </p>
              </div>
            </motion.div>

            {/* Memory Card */}
            <motion.div
              onClick={() => setActiveGame("memory")}
              className="card-cozy p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-4 hover:border-primary transition-all duration-200"
              whileHover={{ y: -6, scale: 1.01 }}
            >
              <span className="text-5xl">🧩</span>
              <div>
                <h3 className="text-lg font-bold text-zinc-955 dark:text-zinc-50">Scrapbook Match</h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
                  Flip tiles to pair cute scrapbook emojis (cameras, gifts, rings, hearts) and test your memory!
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : activeGame === "tictactoe" ? (
          /* Tic Tac Toe Game */
          <motion.div
            key="tictactoe"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full"
          >
            <TicTacToe onBack={() => setActiveGame(null)} />
          </motion.div>
        ) : (
          /* Memory Cards Match Game */
          <motion.div
            key="memory"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full"
          >
            <MemoryMatch onBack={() => setActiveGame(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tic-Tac-Toe Game Component
// ─────────────────────────────────────────────────────────────
function TicTacToe({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isHeartTurn, setIsHeartTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
      [0, 4, 8], [2, 4, 6],             // Diagonal
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner || isDraw) return;

    const newBoard = [...board];
    newBoard[index] = isHeartTurn ? "❤️" : "🌸";
    setBoard(newBoard);

    const matchWinner = checkWinner(newBoard);
    if (matchWinner) {
      setWinner(matchWinner);
    } else if (newBoard.every((square) => square !== null)) {
      setIsDraw(true);
    } else {
      setIsHeartTurn(!isHeartTurn);
    }
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setIsHeartTurn(true);
    setWinner(null);
    setIsDraw(false);
  };

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 sm:p-8 w-full text-center space-y-6 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-150 dark:border-zinc-850">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
        >
          ← Back to selection
        </button>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Tic-Tac-Love</span>
      </div>

      {/* Turn indicator / Win Banner */}
      <div className="h-10 flex items-center justify-center">
        {winner ? (
          <div className="flex items-center gap-1.5 text-base font-bold text-emerald-500">
            <Trophy className="w-5 h-5 fill-emerald-500/10" />
            <span>Winner: {winner}! 🎉</span>
          </div>
        ) : isDraw ? (
          <p className="text-sm font-bold text-zinc-500">It&apos;s a lovely draw! 🤍</p>
        ) : (
          <p className="text-sm font-semibold text-zinc-650 dark:text-zinc-350">
            Turn: <span className="text-base font-bold">{isHeartTurn ? "❤️" : "🌸"}</span>
          </p>
        )}
      </div>

      {/* Grid Board */}
      <div className="grid grid-cols-3 gap-3 w-64 h-64 mx-auto select-none">
        {board.map((cell, idx) => (
          <motion.div
            key={idx}
            onClick={() => handleClick(idx)}
            className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 flex items-center justify-center text-3xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            {cell}
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleReset}
        className="flex items-center gap-1.5 px-4 py-2.5 mx-auto rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
      >
        <RotateCcw className="w-4.5 h-4.5" />
        Reset Board
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Memory Match Game Component
// ─────────────────────────────────────────────────────────────
const EMOJIS = ["📸", "🎁", "💍", "🏖️", "💌", "📜", "🍿", "🗺️"];

function MemoryMatch({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [win, setWin] = useState(false);

  const initGame = () => {
    const paired = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(paired);
    setFlippedIndices([]);
    setMoves(0);
    setWin(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleFlip = (idx: number) => {
    if (cards[idx].isFlipped || cards[idx].isMatched || flippedIndices.length === 2) return;

    const newCards = [...cards];
    newCards[idx].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, idx];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      const [first, second] = newFlipped;

      if (cards[first].emoji === cards[second].emoji) {
        // Match found!
        setTimeout(() => {
          const matchedCards = cards.map((c, i) =>
            i === first || i === second ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setFlippedIndices([]);

          // Check Win status
          if (matchedCards.every((c) => c.isMatched)) {
            setWin(true);
          }
        }, 600);
      } else {
        // Flip back
        setTimeout(() => {
          const resetCards = cards.map((c, i) =>
            i === first || i === second ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 sm:p-8 w-full text-center space-y-6 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-150 dark:border-zinc-850">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
        >
          ← Back to selection
        </button>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Scrapbook Match</span>
      </div>

      <div className="h-10 flex items-center justify-between px-2">
        <span className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Moves: {moves}</span>
        {win ? (
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            <Award className="w-4 h-4" /> All Matched! 🎉
          </span>
        ) : null}
      </div>

      {/* Board grid 4x4 */}
      <div className="grid grid-cols-4 gap-3 select-none">
        {cards.map((card, idx) => {
          const show = card.isFlipped || card.isMatched;
          return (
            <motion.div
              key={card.id}
              onClick={() => handleFlip(idx)}
              className={cn(
                "h-20 rounded-2xl flex items-center justify-center text-2xl border transition-all cursor-pointer",
                show
                  ? "bg-primary/10 border-primary/40 text-zinc-900 dark:text-zinc-50"
                  : "bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-850 text-transparent"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {show ? card.emoji : "❓"}
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={initGame}
        className="flex items-center gap-1.5 px-4 py-2.5 mx-auto rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
      >
        <RotateCcw className="w-4.5 h-4.5" />
        Restart Game
      </button>
    </div>
  );
}
