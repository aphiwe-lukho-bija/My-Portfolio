/* engine.js — a small, dependency-free chess rules engine plus a modest AI.

   Board: 64 squares, index = row * 8 + file. Row 0 is rank 8 (Black's back
   rank), row 7 is rank 1 (White's). Pieces are signed integers:
   +1..+6 White (P N B R Q K), -1..-6 Black. */

export const EMPTY = 0
export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6
export const WHITE = 1
export const BLACK = -1

const CASTLE_WK = 1, CASTLE_WQ = 2, CASTLE_BK = 4, CASTLE_BQ = 8

const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

const rowOf = (sq) => sq >> 3
const fileOf = (sq) => sq & 7
const onBoard = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8

export function squareName (sq) {
  return 'abcdefgh'[fileOf(sq)] + (8 - rowOf(sq))
}

export class Game {
  constructor () {
    this.allPromotions = false
    this.reset()
  }

  reset () {
    const back = [R, N, B, Q, K, B, N, R]
    this.board = new Array(64).fill(EMPTY)
    for (let f = 0; f < 8; f++) {
      this.board[f] = -back[f]
      this.board[8 + f] = -P
      this.board[48 + f] = P
      this.board[56 + f] = back[f]
    }
    this.turn = WHITE
    this.castling = CASTLE_WK | CASTLE_WQ | CASTLE_BK | CASTLE_BQ
    this.ep = -1
    this.halfmove = 0
    this.fullmove = 1
    this.stack = []
    this.keys = [this.positionKey()]
  }

  positionKey () {
    return this.board.join(',') + '|' + this.turn + '|' + this.castling + '|' + this.ep
  }

  /* ---------- attack detection ---------- */

  isAttacked (sq, by) {
    const b = this.board
    const r = rowOf(sq), f = fileOf(sq)

    // pawns: a White pawn attacks upwards (towards row 0)
    const pr = r + (by === WHITE ? 1 : -1)
    for (const df of [-1, 1]) {
      if (onBoard(pr, f + df) && b[pr * 8 + f + df] === by * P) return true
    }
    for (const [dr, df] of KNIGHT_STEPS) {
      if (onBoard(r + dr, f + df) && b[(r + dr) * 8 + f + df] === by * N) return true
    }
    for (const [dr, df] of KING_STEPS) {
      if (onBoard(r + dr, f + df) && b[(r + dr) * 8 + f + df] === by * K) return true
    }
    for (const [dr, df] of BISHOP_DIRS) {
      let rr = r + dr, ff = f + df
      while (onBoard(rr, ff)) {
        const p = b[rr * 8 + ff]
        if (p !== EMPTY) {
          if (p === by * B || p === by * Q) return true
          break
        }
        rr += dr; ff += df
      }
    }
    for (const [dr, df] of ROOK_DIRS) {
      let rr = r + dr, ff = f + df
      while (onBoard(rr, ff)) {
        const p = b[rr * 8 + ff]
        if (p !== EMPTY) {
          if (p === by * R || p === by * Q) return true
          break
        }
        rr += dr; ff += df
      }
    }
    return false
  }

  kingSquare (color) {
    return this.board.indexOf(color * K)
  }

  inCheck (color = this.turn) {
    const k = this.kingSquare(color)
    return k >= 0 && this.isAttacked(k, -color)
  }

  /* ---------- move generation ---------- */

  pseudoMoves (color = this.turn) {
    const moves = []
    const b = this.board
    const add = (from, to, extra) => {
      moves.push({ from, to, piece: b[from], captured: b[to], flag: null, promo: 0, ...extra })
    }
    // the interface always promotes to a queen; the tests switch on every
    // promotion piece so the generator can be checked against published counts
    const addPromotions = (from, to) => {
      const pieces = this.allPromotions ? [Q, R, B, N] : [Q]
      for (const t of pieces) add(from, to, { flag: 'promo', promo: color * t })
    }

    for (let sq = 0; sq < 64; sq++) {
      const piece = b[sq]
      if (piece === EMPTY || Math.sign(piece) !== color) continue
      const type = Math.abs(piece)
      const r = rowOf(sq), f = fileOf(sq)

      if (type === P) {
        const dir = color === WHITE ? -1 : 1
        const startRow = color === WHITE ? 6 : 1
        const lastRow = color === WHITE ? 0 : 7
        const r1 = r + dir
        if (onBoard(r1, f) && b[r1 * 8 + f] === EMPTY) {
          if (r1 === lastRow) addPromotions(sq, r1 * 8 + f)
          else add(sq, r1 * 8 + f)
          const r2 = r + 2 * dir
          if (r === startRow && b[r2 * 8 + f] === EMPTY) add(sq, r2 * 8 + f, { flag: 'double' })
        }
        for (const df of [-1, 1]) {
          if (!onBoard(r1, f + df)) continue
          const to = r1 * 8 + f + df
          const target = b[to]
          if (target !== EMPTY && Math.sign(target) === -color) {
            if (r1 === lastRow) addPromotions(sq, to)
            else add(sq, to)
          } else if (to === this.ep) {
            add(sq, to, { flag: 'ep', captured: -color * P })
          }
        }
      } else if (type === N || type === K) {
        for (const [dr, df] of (type === N ? KNIGHT_STEPS : KING_STEPS)) {
          if (!onBoard(r + dr, f + df)) continue
          const to = (r + dr) * 8 + f + df
          if (b[to] === EMPTY || Math.sign(b[to]) === -color) add(sq, to)
        }
        if (type === K) this.castleMoves(color, sq, add)
      } else {
        const dirs = type === B ? BISHOP_DIRS : type === R ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS]
        for (const [dr, df] of dirs) {
          let rr = r + dr, ff = f + df
          while (onBoard(rr, ff)) {
            const to = rr * 8 + ff
            if (b[to] === EMPTY) add(sq, to)
            else {
              if (Math.sign(b[to]) === -color) add(sq, to)
              break
            }
            rr += dr; ff += df
          }
        }
      }
    }
    return moves
  }

  castleMoves (color, kingSq, add) {
    const b = this.board
    const home = color === WHITE ? 60 : 4
    if (kingSq !== home) return
    if (this.isAttacked(home, -color)) return
    const kSide = color === WHITE ? CASTLE_WK : CASTLE_BK
    const qSide = color === WHITE ? CASTLE_WQ : CASTLE_BQ
    if ((this.castling & kSide) && b[home + 3] === color * R &&
        b[home + 1] === EMPTY && b[home + 2] === EMPTY &&
        !this.isAttacked(home + 1, -color) && !this.isAttacked(home + 2, -color)) {
      add(home, home + 2, { flag: 'castleK' })
    }
    if ((this.castling & qSide) && b[home - 4] === color * R &&
        b[home - 1] === EMPTY && b[home - 2] === EMPTY && b[home - 3] === EMPTY &&
        !this.isAttacked(home - 1, -color) && !this.isAttacked(home - 2, -color)) {
      add(home, home - 2, { flag: 'castleQ' })
    }
  }

  legalMoves (color = this.turn) {
    const out = []
    for (const m of this.pseudoMoves(color)) {
      this.make(m)
      if (!this.inCheck(color)) out.push(m)
      this.unmake()
    }
    return out
  }

  legalMovesFrom (sq) {
    return this.legalMoves().filter((m) => m.from === sq)
  }

  /* ---------- make / unmake ---------- */

  make (m) {
    const b = this.board
    const color = Math.sign(m.piece)
    const undo = {
      move: m,
      castling: this.castling,
      ep: this.ep,
      halfmove: this.halfmove,
      fullmove: this.fullmove
    }
    this.stack.push(undo)

    b[m.to] = m.flag === 'promo' ? m.promo : m.piece
    b[m.from] = EMPTY

    if (m.flag === 'ep') {
      b[m.to + (color === WHITE ? 8 : -8)] = EMPTY
    } else if (m.flag === 'castleK') {
      b[m.to - 1] = b[m.to + 1]
      b[m.to + 1] = EMPTY
    } else if (m.flag === 'castleQ') {
      b[m.to + 1] = b[m.to - 2]
      b[m.to - 2] = EMPTY
    }

    // castling rights fall away when a king or rook moves, or a rook is taken
    const lose = (sq) => {
      if (sq === 60) this.castling &= ~(CASTLE_WK | CASTLE_WQ)
      else if (sq === 4) this.castling &= ~(CASTLE_BK | CASTLE_BQ)
      else if (sq === 63) this.castling &= ~CASTLE_WK
      else if (sq === 56) this.castling &= ~CASTLE_WQ
      else if (sq === 7) this.castling &= ~CASTLE_BK
      else if (sq === 0) this.castling &= ~CASTLE_BQ
    }
    lose(m.from); lose(m.to)

    this.ep = m.flag === 'double' ? (m.from + m.to) >> 1 : -1
    this.halfmove = (Math.abs(m.piece) === P || m.captured !== EMPTY) ? 0 : this.halfmove + 1
    if (color === BLACK) this.fullmove++
    this.turn = -color
  }

  unmake () {
    const u = this.stack.pop()
    const m = u.move
    const b = this.board
    const color = Math.sign(m.piece)

    b[m.from] = m.piece
    b[m.to] = m.flag === 'ep' ? EMPTY : m.captured
    if (m.flag === 'ep') {
      b[m.to + (color === WHITE ? 8 : -8)] = -color * P
    } else if (m.flag === 'castleK') {
      b[m.to + 1] = b[m.to - 1]
      b[m.to - 1] = EMPTY
    } else if (m.flag === 'castleQ') {
      b[m.to - 2] = b[m.to + 1]
      b[m.to + 1] = EMPTY
    }

    this.castling = u.castling
    this.ep = u.ep
    this.halfmove = u.halfmove
    this.fullmove = u.fullmove
    this.turn = color
  }

  /* play a move for real (records the repetition key) */
  play (m) {
    this.make(m)
    this.keys.push(this.positionKey())
  }

  undo () {
    if (!this.stack.length) return null
    this.keys.pop()
    const m = this.stack[this.stack.length - 1].move
    this.unmake()
    return m
  }

  /* ---------- game state ---------- */

  insufficientMaterial () {
    const minors = []
    for (const p of this.board) {
      const t = Math.abs(p)
      if (t === EMPTY || t === K) continue
      if (t === P || t === R || t === Q) return false
      minors.push(t)
    }
    return minors.length <= 1
  }

  status () {
    const moves = this.legalMoves()
    const check = this.inCheck()
    if (!moves.length) {
      return check
        ? { over: true, result: 'checkmate', winner: -this.turn, check }
        : { over: true, result: 'stalemate', winner: 0, check }
    }
    if (this.insufficientMaterial()) return { over: true, result: 'insufficient', winner: 0, check }
    if (this.halfmove >= 100) return { over: true, result: 'fifty', winner: 0, check }
    const key = this.keys[this.keys.length - 1]
    if (this.keys.filter((k) => k === key).length >= 3) {
      return { over: true, result: 'repetition', winner: 0, check }
    }
    return { over: false, result: null, winner: 0, check }
  }

  /* ---------- AI ---------- */

  evaluate () {
    // positive = good for White
    let score = 0
    const b = this.board
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq]
      if (p === EMPTY) continue
      const t = Math.abs(p)
      const white = p > 0
      const tableIdx = white ? sq : (7 - rowOf(sq)) * 8 + fileOf(sq)
      const v = VALUE[t] + PST[t][tableIdx]
      score += white ? v : -v
    }
    return score
  }

  /* picks a move for the side to move. depth 1 is a casual player, 3 is
     a careful one. `noise` makes weaker levels sometimes choose a close
     second best so that they feel human instead of mechanical. */
  bestMove ({ depth = 2, noise = 0 } = {}) {
    const color = this.turn
    const moves = this.orderMoves(this.legalMoves())
    if (!moves.length) return null
    const scored = []
    let alpha = -Infinity
    for (const m of moves) {
      this.make(m)
      const s = -this.search(depth - 1, -Infinity, -alpha, -color)
      this.unmake()
      scored.push({ m, s })
      if (noise === 0 && s > alpha) alpha = s
    }
    scored.sort((a, b2) => b2.s - a.s)
    if (noise > 0) {
      const pool = scored.filter((x) => x.s >= scored[0].s - noise)
      return pool[Math.floor(Math.random() * pool.length)].m
    }
    return scored[0].m
  }

  orderMoves (moves) {
    return moves.sort((a, b) => moveHeuristic(b) - moveHeuristic(a))
  }

  /* negamax with alpha-beta; the score is from `color`'s point of view */
  search (depth, alpha, beta, color) {
    if (depth <= 0) return this.quiesce(alpha, beta, color, 3)
    const moves = this.orderMoves(this.pseudoMoves(color))
    let legal = 0
    for (const m of moves) {
      this.make(m)
      if (this.inCheck(color)) { this.unmake(); continue }
      legal++
      const s = -this.search(depth - 1, -beta, -alpha, -color)
      this.unmake()
      if (s >= beta) return beta
      if (s > alpha) alpha = s
    }
    if (!legal) return this.inCheck(color) ? -100000 - depth : 0
    return alpha
  }

  quiesce (alpha, beta, color, limit) {
    const stand = this.evaluate() * color
    if (limit <= 0) return stand
    if (stand >= beta) return beta
    if (stand > alpha) alpha = stand
    const caps = this.orderMoves(this.pseudoMoves(color).filter((m) => m.captured !== EMPTY || m.flag === 'promo'))
    for (const m of caps) {
      this.make(m)
      if (this.inCheck(color)) { this.unmake(); continue }
      const s = -this.quiesce(-beta, -alpha, -color, limit - 1)
      this.unmake()
      if (s >= beta) return beta
      if (s > alpha) alpha = s
    }
    return alpha
  }

  /* node count for a fixed depth — used to test the move generator */
  perft (depth) {
    if (depth === 0) return 1
    let n = 0
    for (const m of this.legalMoves()) {
      this.make(m)
      n += this.perft(depth - 1)
      this.unmake()
    }
    return n
  }

  /* load a position from FEN (used by the tests) */
  loadFen (fen) {
    const [placement, turn, castle, ep] = fen.split(' ')
    this.board = new Array(64).fill(EMPTY)
    const map = { p: P, n: N, b: B, r: R, q: Q, k: K }
    let sq = 0
    for (const ch of placement) {
      if (ch === '/') continue
      if (/\d/.test(ch)) { sq += Number(ch); continue }
      const lower = ch.toLowerCase()
      this.board[sq++] = (ch === lower ? -1 : 1) * map[lower]
    }
    this.turn = turn === 'w' ? WHITE : BLACK
    this.castling = 0
    if (castle.includes('K')) this.castling |= CASTLE_WK
    if (castle.includes('Q')) this.castling |= CASTLE_WQ
    if (castle.includes('k')) this.castling |= CASTLE_BK
    if (castle.includes('q')) this.castling |= CASTLE_BQ
    this.ep = ep && ep !== '-' ? (8 - Number(ep[1])) * 8 + 'abcdefgh'.indexOf(ep[0]) : -1
    this.halfmove = 0
    this.fullmove = 1
    this.stack = []
    this.keys = [this.positionKey()]
  }
}

/* ---------- evaluation tables ---------- */

const VALUE = [0, 100, 320, 330, 500, 900, 20000]

function moveHeuristic (m) {
  let h = 0
  if (m.captured !== EMPTY) h += 10 * VALUE[Math.abs(m.captured)] - VALUE[Math.abs(m.piece)] / 10
  if (m.flag === 'promo') h += 800
  return h
}

// piece-square tables, written from White's point of view (row 0 = rank 8)
const PST = [
  null,
  [ // pawn
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
  ],
  [ // knight
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ],
  [ // bishop
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
  ],
  [ // rook
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0
  ],
  [ // queen
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
  ],
  [ // king (middlegame: stay tucked away)
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
  ]
]
