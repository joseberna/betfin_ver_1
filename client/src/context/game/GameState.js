import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CS_CALL, CS_CHECK, CS_FOLD, CS_JOIN_TABLE, CS_LEAVE_TABLE, CS_RAISE,
  SC_TABLE_JOINED, SC_TABLE_LEFT, SC_TABLE_UPDATED,
} from '../../pokergame/actions'
import socketContext from '../websocket/socketContext'
import GameContext from './gameContext'

const GameState = ({ children }) => {
  const { socket } = useContext(socketContext)
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [seatId, setSeatId] = useState(null)
  const [turn, setTurn] = useState(false)
  const [turnTimeout, setTurnTimeout] = useState(null)
  const [lastResult, setLastResult] = useState(null)   // <-- ganador(es)

  const tableRef = useRef(null)
  useEffect(() => { tableRef.current = currentTable }, [currentTable])

  useEffect(() => {
    if (!socket) return

    const onTableUpdated = ({ table, message, handResult }) => {
      console.log('[CLIENT] SC_TABLE_UPDATED', { message, handResult, tableHandOver: table?.handOver });

      let next = table
      if (typeof table === 'string') {
        const s = table.trim()
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          try { next = JSON.parse(s) } catch { }
        }
      }
      if (!next) return

      // identifica mi seat
      const myId = socket.id
      const mySeat = Object.entries(next.seats || {}).find(([, s]) => s?.player?.socketId === myId)
      if (mySeat) setSeatId(Number(mySeat[0]))

      setCurrentTable(next)

      // ganador/es al final de la mano
      if (handResult) setLastResult(handResult)

      // mensajes
      if (typeof message === 'string' && message.includes('New hand started')) {
        setMessages([])         // limpia cuando arranca mano nueva
        setLastResult(null)     // oculta cartel de ganadores
      } else if (message) {
        setMessages(prev => [...prev, message])
      }

      // flag de turno
      if (mySeat) setTurn(!!mySeat[1]?.turn)
      if (handResult?.messages?.length) {
        console.log('[CLIENT] SHOWDOWN:', handResult.messages);
        setLastResult(handResult);
      }
      if (typeof message === 'string' && message.includes('New hand started')) {
        console.log('[CLIENT] Clearing result/messages on new hand');
        setMessages([]);
        setLastResult(null);
      }
    }

    const onTableJoined = ({ seatId }) => { if (seatId) setSeatId(seatId) }
    const onTableLeft = ({ tableId }) => {
      console.log('[CLIENT] SC_TABLE_LEFT for table', tableId);
      setCurrentTable(null);
      setMessages([]);
      setSeatId(null);
      setTurn(false);
      setLastResult(null);
      navigate('/', { replace: true });
    };

    socket.off(SC_TABLE_UPDATED).on(SC_TABLE_UPDATED, onTableUpdated)
    socket.off(SC_TABLE_JOINED).on(SC_TABLE_JOINED, onTableJoined)
    socket.off(SC_TABLE_LEFT).on(SC_TABLE_LEFT, onTableLeft)

    const beforeUnload = () => leaveTable()
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      socket.off(SC_TABLE_UPDATED, onTableUpdated)
      socket.off(SC_TABLE_JOINED, onTableJoined)
      socket.off(SC_TABLE_LEFT, onTableLeft)
    }
  }, [socket])

  // auto-fold a los 15s en tu turno
  useEffect(() => {
    if (turn && !turnTimeout) {
      const h = setTimeout(() => fold(), 15000)
      setTurnTimeout(h)
    } else if (!turn && turnTimeout) {
      clearTimeout(turnTimeout)
      setTurnTimeout(null)
    }
  }, [turn, turnTimeout])

  // API al resto de la app
  const joinTable = (tableId) => socket?.emit(CS_JOIN_TABLE, tableId)

  const leaveTable = () => {
    const id = tableRef.current?.id
    console.log('[CLIENT] leaveTable called; tableId=', id);
    if (id && socket) socket.emit(CS_LEAVE_TABLE, id)
    navigate('/', { replace: true })           // <-- te saca de /play
  }

  const fold = () => { const id = tableRef.current?.id; if (id) socket.emit(CS_FOLD, id) }
  const check = () => { const id = tableRef.current?.id; if (id) socket.emit(CS_CHECK, id) }
  const call = () => { const id = tableRef.current?.id; if (id) socket.emit(CS_CALL, id) }
  const raise = (amount) => { const id = tableRef.current?.id; if (id) socket.emit(CS_RAISE, { tableId: id, amount }) }

  return (
    <GameContext.Provider
      value={{
        messages,
        currentTable,
        seatId,
        lastResult,      // <-- expuesto para UI (ganadores)
        joinTable,
        leaveTable,
        fold,
        check,
        call,
        raise,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export default GameState
