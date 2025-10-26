import React, { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
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
import './Play.scss'

const Play = () => {
  const [winnerMessage, setWinnerMessage] = useState(null)
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
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

  // --- Guard: sin wallet, vuelve al inicio ---
  useEffect(() => {
    if (!isConnected || !address) navigate('/', { replace: true })
  }, [isConnected, address, navigate])

  // --- Join controlado al cargar ---
  useEffect(() => {
    if (!socket || !address || joinedRef.current) return
    const doJoin = () => {
      if (joinedRef.current) return
      joinTable(1)
      joinedRef.current = true
    }
    if (socket.connected) doJoin()
    else socket.once('connect', doJoin)

    return () => {
      socket.off?.('connect', doJoin)
    }
  }, [socket, address, joinTable])

  // --- Ajuste automático de apuesta según estado ---
  useEffect(() => {
    if (!currentTable) return
    const { callAmount, minBet, pot, minRaise } = currentTable
    if (callAmount > minBet) setBet(callAmount)
    else if (pot > 0) setBet(minRaise)
    else setBet(minBet)
  }, [currentTable])

  // --- Mostrar mensaje del ganador (4 s) ---
  useEffect(() => {
    if (currentTable?.winMessages?.length > 0) {
      const lastWin = currentTable.winMessages[currentTable.winMessages.length - 1]
      setWinnerMessage(lastWin)
      const timeout = setTimeout(() => setWinnerMessage(null), 4000)
      return () => clearTimeout(timeout)
    }
  }, [currentTable?.winMessages])

  // --- Handler salir de mesa ---
  const handleLeave = () => {
    joinedRef.current = false
    leaveTable()
    socket.disconnect() // Desconecta completamente
    navigate('/', { replace: true }) // Regresa al home
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
          <PositionedUISlot
            top="2vh"
            left="1.5rem"
            scale="0.65"
            style={{ zIndex: '50' }}
          >
            <Button small secondary onClick={handleLeave}>
              Leave
            </Button>
          </PositionedUISlot>
        )}

        <PokerTableWrapper>
          <PokerTable />

          {currentTable && (
            <>
              {/* --- SEATS --- */}
              <PositionedUISlot top="-5%" left="0" scale="0.55" origin="top left">
                <Seat seatNumber={1} currentTable={currentTable} sitDown={sitDown} />
              </PositionedUISlot>
              <PositionedUISlot top="-5%" right="2%" scale="0.55" origin="top right">
                <Seat seatNumber={2} currentTable={currentTable} sitDown={sitDown} />
              </PositionedUISlot>
              <PositionedUISlot bottom="15%" right="2%" scale="0.55" origin="bottom right">
                <Seat seatNumber={3} currentTable={currentTable} sitDown={sitDown} />
              </PositionedUISlot>
              <PositionedUISlot bottom="8%" scale="0.55" origin="bottom center">
                <Seat seatNumber={4} currentTable={currentTable} sitDown={sitDown} />
              </PositionedUISlot>
              <PositionedUISlot bottom="15%" left="0" scale="0.55" origin="bottom left">
                <Seat seatNumber={5} currentTable={currentTable} sitDown={sitDown} />
              </PositionedUISlot>

              {/* --- LOGO --- */}
              <PositionedUISlot
                top="-25%"
                scale="0.55"
                origin="top center"
                style={{ zIndex: 1 }}
              >
                <BrandingImage />
              </PositionedUISlot>

              {/* --- BOARD --- */}
              <PositionedUISlot
                width="100%"
                origin="center center"
                scale="0.60"
                style={{
                  display: 'flex',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {Array.isArray(currentTable.board) &&
                  currentTable.board.length > 0 &&
                  currentTable.board.map((card, i) => (
                    <PokerCard key={i} card={card} />
                  ))}
              </PositionedUISlot>

              {/* --- MENSAJES Y GANADOR --- */}
              <PositionedUISlot
                top="-5%"
                scale="0.60"
                origin="bottom center"
                style={{ minHeight: '60px' }}
              >
                {winnerMessage ? (
                  <InfoPill>{winnerMessage}</InfoPill>
                ) : messages?.length > 0 ? (
                  <InfoPill>{messages[messages.length - 1]}</InfoPill>
                ) : null}
              </PositionedUISlot>

              {/* --- ESTADO DE LA MANO --- */}
              <PositionedUISlot top="12%" scale="0.60" origin="center center">
                {(currentTable.winMessages?.length ?? 0) === 0 && (
                  <GameStateInfo currentTable={currentTable} />
                )}
              </PositionedUISlot>
            </>
          )}
        </PokerTableWrapper>

        {/* --- CONTROLES DE JUGADOR --- */}
        {currentTable?.seats?.[seatId]?.turn && (
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
        )}
      </Container>
    </>
  )
}

export default Play
