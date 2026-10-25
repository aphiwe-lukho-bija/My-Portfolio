/* ai.worker.js — runs the engine's search off the main thread so the 3D
   scene and page stay smooth while the computer is thinking. */
import { Game } from './engine.js'

self.onmessage = (e) => {
  const { id, state, depth, noise } = e.data
  const g = new Game()
  g.board = state.board
  g.turn = state.turn
  g.castling = state.castling
  g.ep = state.ep
  g.halfmove = state.halfmove
  g.stack = []
  g.keys = []
  const m = g.bestMove({ depth, noise })
  self.postMessage({
    id,
    move: m ? { from: m.from, to: m.to, flag: m.flag, promo: m.promo } : null
  })
}
