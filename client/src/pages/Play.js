// client/src/pages/Play.js
import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import globalContext from '../context/global/globalContext'
import gameContext from '../context/game/gameContext'
import socketContext from '../context/websocket/socketContext'
import PokerTable from '../components/game/PokerTable'
import { RotateDevicePrompt } from '../components/game/RotateDevicePrompt'
import { PositionedUISlot } from '../components/game/PositionedUISlot'
import { PokerTableWrapper } from '../components/game/PokerTableWrapper'
import { Seat } from '../components/game/Seat/Seat'
import { InfoPill } from '../components/game/InfoPill'
import { GameUI } from '../components/game/GameUI'
import { GameStateInfo } from '../components/game/GameStateInfo'
import BrandingImage from '../components/game/BrandingImage'
import PokerCard from '../components/game/PokerCard'
import background from '../assets/img/background.png'
import { useAccount } from 'wagmi'
import { CS_FETCH_LOBBY_INFO, SC_RECEIVE_LOBBY_INFO } from '../pokergame/actions'
import './Play.scss'

const Play = () => {
  const [winnerMessage, setWinnerMessage] = useState(null)
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const { selectedTableId, setSelectedTableId } = useContext(globalContext)

  const {
    messages,
    currentTable,
    seatId,
    joinTable,
    leaveTable,
    sitDown,
    standUp,
    fold,
    check,
    call,
    raise,
  } = useContext(gameContext)

  const { isConnected, address } = useAccount()
  const [bet, setBet] = useState(0)
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!socket || !isConnected) return
    socket.emit(CS_FETCH_LOBBY_INFO, {
      walletAddress: address,
      username: address ? `player_${address.slice(2, 6)}` : undefined,
    })
  }, [socket, isConnected, address])

  // 1) Si no hay wallet → home
  useEffect(() => {
    if (!isConnected) navigate('/', { replace: true })
  }, [isConnected, navigate])

  // 2) Si no hay mesa seleccionada → lobby
  useEffect(() => {
    if (selectedTableId == null) navigate('/lobby', { replace: true })
  }, [selectedTableId, navigate])

  // 3) Unirse solo con selectedTableId (sin location.state)
  useEffect(() => {
    if (!socket || joinedRef.current || selectedTableId == null) return

    const doJoin = () => {
      if (joinedRef.current) return
      joinTable(selectedTableId)
      joinedRef.current = true
    }

    const onceLobby = () => { doJoin() }
    socket.once(SC_RECEIVE_LOBBY_INFO, onceLobby)

    if (socket.connected) {
      setTimeout(() => !joinedRef.current && doJoin(), 300)
    } else {
      socket.once('connect', () => {
        socket.emit(CS_FETCH_LOBBY_INFO, {
          walletAddress: address,
          username: address ? `player_${address.slice(2, 6)}` : undefined,
        })
      })
    }

    return () => {
      socket.off(SC_RECEIVE_LOBBY_INFO, onceLobby)
      socket.off('connect')
    }
  }, [socket, joinTable, selectedTableId, address])

  // 4) Apuesta por defecto según estado
  useEffect(() => {
    if (!currentTable) return
    const { callAmount, minBet, pot, minRaise } = currentTable
    if (callAmount > minBet) setBet(callAmount)
    else if (pot > 0) setBet(minRaise)
    else setBet(minBet)
  }, [currentTable])

  // 5) Mostrar ganador (4s)
  useEffect(() => {
    if (currentTable?.winMessages?.length > 0) {
      const lastWin = currentTable.winMessages.at(-1)
      setWinnerMessage(lastWin)
      const t = setTimeout(() => setWinnerMessage(null), 4000)
      return () => clearTimeout(t)
    }
  }, [currentTable?.winMessages])

  // 6) Salir → abandonar mesa y volver al lobby
  const handleLeave = () => {
    joinedRef.current = false
    leaveTable()
    setSelectedTableId(null)
    navigate('/lobby', { replace: true })
  }

  return (
    <>
      <RotateDevicePrompt />
      <Container
        fullHeight
        style={{
          backgroundImage: `url(${background})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed',
          backgroundColor: 'black',
        }}
        className="play-area"
      >
        {currentTable && (
          <PositionedUISlot top="2vh" left="1.5rem" scale="0.65" style={{ zIndex: 50 }}>
            <Button small secondary onClick={handleLeave}>Leave</Button>
          </PositionedUISlot>
        )}

        <PokerTableWrapper>
          <PokerTable />

          {currentTable && (
            <>
              {[1, 2, 3, 4, 5].map((n, i) => {
                const pos = [
                  { top: '-5%', left: '0', origin: 'top left' },
                  { top: '-5%', right: '2%', origin: 'top right' },
                  { bottom: '15%', right: '2%', origin: 'bottom right' },
                  { bottom: '8%', origin: 'bottom center' },
                  { bottom: '15%', left: '0', origin: 'bottom left' },
                ][i]
                return (
                  <PositionedUISlot key={n} scale="0.55" {...pos}>
                    <Seat seatNumber={n} currentTable={currentTable} sitDown={sitDown} />
                  </PositionedUISlot>
                )
              })}

              <PositionedUISlot top="-25%" scale="0.55" origin="top center" style={{ zIndex: 1 }}>
                <BrandingImage />
              </PositionedUISlot>

              <PositionedUISlot
                width="100%"
                origin="center center"
                scale="0.6"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {currentTable.board?.map((card, i) => <PokerCard key={i} card={card} />)}
              </PositionedUISlot>

              <PositionedUISlot top="-5%" scale="0.6" origin="bottom center" style={{ minHeight: 60 }}>
                {winnerMessage
                  ? <InfoPill>{winnerMessage}</InfoPill>
                  : (messages?.length ? <InfoPill>{messages.at(-1)}</InfoPill> : null)}
              </PositionedUISlot>

              <PositionedUISlot top="12%" scale="0.6" origin="center center">
                {(currentTable.winMessages?.length ?? 0) === 0 && (
                  <GameStateInfo currentTable={currentTable} />
                )}
              </PositionedUISlot>
            </>
          )}
        </PokerTableWrapper>

        {currentTable?.seats?.[seatId]?.turn && (
          <div className="controls-dock">
            <GameUI
              currentTable={currentTable}
              seatId={seatId}
              bet={bet}
              setBet={setBet}
              raise={raise}
              standUp={standUp}
              fold={fold}
              check={check}
              call={call}
            />
          </div>
        )}
      </Container>
    </>
  )
}

export default Play
