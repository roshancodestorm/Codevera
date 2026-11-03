import { useMemo, useState } from "react";

type Tile = "ruby" | "lemon" | "aqua" | "mint" | "grape" | "peach";
type Cell = { id: string; tile: Tile };
type Pos = { row: number; col: number };

const size = 8;
const tiles: Tile[] = ["ruby", "lemon", "aqua", "mint", "grape", "peach"];
const uid = () => Math.random().toString(36).slice(2, 9);
const randomTile = () => tiles[Math.floor(Math.random() * tiles.length)];

function makeBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let row = 0; row < size; row++) {
    board[row] = [];
    for (let col = 0; col < size; col++) {
      let tile = randomTile();
      while ((col >= 2 && board[row][col - 1].tile === tile && board[row][col - 2].tile === tile) || (row >= 2 && board[row - 1][col].tile === tile && board[row - 2][col].tile === tile)) {
        tile = randomTile();
      }
      board[row][col] = { id: uid(), tile };
    }
  }
  return board;
}

function cloneBoard(board: Cell[][]) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function findMatches(board: Cell[][]) {
  const matched = new Set<string>();
  for (let row = 0; row < size; row++) {
    let run = 1;
    for (let col = 1; col <= size; col++) {
      if (col < size && board[row][col].tile === board[row][col - 1].tile) run++;
      else {
        if (run >= 3) for (let i = 0; i < run; i++) matched.add(`${row},${col - 1 - i}`);
        run = 1;
      }
    }
  }
  for (let col = 0; col < size; col++) {
    let run = 1;
    for (let row = 1; row <= size; row++) {
      if (row < size && board[row][col].tile === board[row - 1][col].tile) run++;
      else {
        if (run >= 3) for (let i = 0; i < run; i++) matched.add(`${row - 1 - i},${col}`);
        run = 1;
      }
    }
  }
  return matched;
}

function collapse(board: Cell[][], matched: Set<string>) {
  const next = cloneBoard(board);
  for (let col = 0; col < size; col++) {
    const kept: Cell[] = [];
    for (let row = size - 1; row >= 0; row--) {
      if (!matched.has(`${row},${col}`)) kept.push(next[row][col]);
    }
    for (let row = size - 1; row >= 0; row--) {
      next[row][col] = kept[size - 1 - row] ?? { id: uid(), tile: randomTile() };
    }
  }
  return next;
}

function resolveBoard(start: Cell[][]) {
  let board = cloneBoard(start);
  let cleared = 0;
  let cascades = 0;
  for (let guard = 0; guard < 8; guard++) {
    const matches = findMatches(board);
    if (!matches.size) break;
    cleared += matches.size;
    cascades++;
    board = collapse(board, matches);
  }
  return { board, cleared, cascades };
}

function areAdjacent(a: Pos, b: Pos) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export default function TruiserGame({ onDashboard }: { onDashboard: () => void }) {
  const [board, setBoard] = useState(() => makeBoard());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [message, setMessage] = useState("Swap adjacent tiles to match 3 or more.");
  const best = useMemo(() => Number(localStorage.getItem("gameforge:truiser-best") ?? 0), [score]);

  const restart = () => {
    setBoard(makeBoard());
    setSelected(null);
    setScore(0);
    setMoves(30);
    setMessage("New board ready. Match 3 or more tiles.");
  };

  const saveScore = (nextScore: number) => {
    const currentBest = Number(localStorage.getItem("gameforge:truiser-best") ?? 0);
    if (nextScore > currentBest) localStorage.setItem("gameforge:truiser-best", String(nextScore));
  };

  const choose = (pos: Pos) => {
    if (moves <= 0) return;
    if (!selected) {
      setSelected(pos);
      return;
    }
    if (selected.row === pos.row && selected.col === pos.col) {
      setSelected(null);
      return;
    }
    if (!areAdjacent(selected, pos)) {
      setSelected(pos);
      setMessage("Choose a tile next to the selected one.");
      return;
    }

    const swapped = cloneBoard(board);
    [swapped[selected.row][selected.col], swapped[pos.row][pos.col]] = [swapped[pos.row][pos.col], swapped[selected.row][selected.col]];
    const immediateMatches = findMatches(swapped);
    if (!immediateMatches.size) {
      setSelected(null);
      setMoves((current) => Math.max(0, current - 1));
      setMessage("No match. Try another swap.");
      return;
    }

    const result = resolveBoard(swapped);
    const nextScore = score + result.cleared * 60 + Math.max(0, result.cascades - 1) * 120;
    setBoard(result.board);
    setSelected(null);
    setScore(nextScore);
    setMoves((current) => Math.max(0, current - 1));
    saveScore(nextScore);
    setMessage(`Cleared ${result.cleared} tiles${result.cascades > 1 ? ` with ${result.cascades} cascades` : ""}.`);
  };

  return (
    <main className="truiser-page">
      <section className="truiser-header">
        <button className="secondary" onClick={onDashboard}>Back to Dashboard</button>
        <div><p className="eyebrow">Built-in playable game</p><h1>Truiser</h1></div>
        <div className="truiser-stats"><span>Score <b>{score}</b></span><span>Best <b>{Math.max(best, score)}</b></span><span>Moves <b>{moves}</b></span></div>
      </section>
      <section className="truiser-shell">
        <div className="truiser-board" aria-label="Truiser match three board">
          {board.map((row, rowIndex) => row.map((cell, colIndex) => {
            const active = selected?.row === rowIndex && selected?.col === colIndex;
            return <button key={cell.id} className={`truiser-tile ${cell.tile} ${active ? "selected" : ""}`} onClick={() => choose({ row: rowIndex, col: colIndex })}><span></span></button>;
          }))}
        </div>
        <aside className="truiser-panel">
          <h2>How to play</h2>
          <p>{message}</p>
          <p>Select one tile, then select a neighboring tile. If it creates 3 or more in a row or column, tiles clear and new ones fall.</p>
          <button className="primary" onClick={restart}>Restart</button>
        </aside>
      </section>
    </main>
  );
}
