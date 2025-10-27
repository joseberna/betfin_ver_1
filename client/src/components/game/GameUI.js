// client/src/components/game/GameUI.js
import React from 'react'
import Button from '../buttons/Button'
import { BetSlider } from './Betslider/BetSlider'
import { UIWrapper } from './UIWrapper'

export const GameUI = ({
  currentTable,
  seatId,
  bet,
  setBet,
  raise,
  standUp, // si lo usas en otro lado, se mantiene en props
  fold,
  check,
  call,
}) => {
  const me = currentTable?.seats?.[seatId]
  const myTurn = !!me?.turn

  const callAmount = currentTable?.callAmount ?? 0
  const minBet = currentTable?.minBet ?? 0
  const minRaise = currentTable?.minRaise ?? Math.max(minBet * 2, minBet)
  const maxBet = Math.max(minRaise, me?.stack ?? minRaise)

  const canCheck = myTurn && (callAmount === 0 || me?.bet >= callAmount)
  const canCall = myTurn && callAmount > 0 && (me?.bet ?? 0) < callAmount

  const onRaise = () => {
    // Si tu raise debe incluir bet actual + bet en mesa, usa la línea original;
    // si tu backend espera el monto final absoluto, deja "bet".
    // Original tuyo:
    // raise(bet + currentTable.seats[seatId].bet)
    const final = Math.min(Math.max(bet, minRaise), maxBet)
    raise(final + (me?.bet ?? 0))
  }

  // Contenedor de barra: centrado fijo con ancho máximo
  const barStyle = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 'clamp(10px, 3vh, 24px)',
    width: 'min(980px, 94vw)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 12px',
    background: 'rgba(0,0,0,.35)',
    backdropFilter: 'blur(4px)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.12)',
    pointerEvents: 'auto',
  }

  const actionsStyle = {
    display: 'flex',
    gap: 8,
    flex: '0 0 auto',
    alignItems: 'center',
  }

  // Cada botón va envuelto en un contenedor de ancho fijo,
  // así el disabled no cambia el espacio ocupado.
  const btnBox = { width: 110 }
  const btnStyle = { width: '100%', minHeight: 40 }

  const raiseRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: '1 1 auto',
    minWidth: 260,
  }

  const amountStyle = {
    flex: '0 0 auto',
    minWidth: 88,
    textAlign: 'right',
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(0,0,0,.35)',
    border: '1px solid rgba(255,255,255,.12)',
  }

  return (
    <UIWrapper style={{ pointerEvents: 'none' /* deja clicks fuera de la barra */, display: 'contents' }}>
      <div style={barStyle}>
        <div style={actionsStyle}>
          <div style={btnBox}>
            <Button small secondary onClick={fold} disabled={!myTurn} style={btnStyle}>
              Fold
            </Button>
          </div>
          <div style={btnBox}>
            <Button
              small
              secondary
              onClick={check}
              disabled={!canCheck}
              style={btnStyle}
            >
              Check
            </Button>
          </div>
          <div style={btnBox}>
            <Button
              small
              onClick={call}
              disabled={!canCall}
              style={btnStyle}
            >
              Call
            </Button>
          </div>
          <div style={btnBox}>
            <Button
              small
              onClick={onRaise}
              disabled={!myTurn}
              style={btnStyle}
            >
              Raise
            </Button>
          </div>
        </div>

        <div
          style={{
            ...raiseRowStyle,
            // Conserva tu look de marco para el slider:
            border: '2px solid',
            borderImage: 'linear-gradient(to bottom, #21a68e, #0d3733) 2',
            backgroundImage: 'linear-gradient(to bottom, #187969, #081c1c)',
            backgroundOrigin: 'border-box',
            padding: '0 6px',
            clipPath: `polygon(
              0 5px, 5px 0,
              calc(100% - 5px) 0, 100% 5px,
              100% calc(100% - 5px), calc(100% - 5px) 100%,
              5px 100%, 0% calc(100% - 5px),
              0% 5px
            )`,
          }}
        >
          <BetSlider
            currentTable={currentTable}
            seatId={seatId}
            bet={Math.min(Math.max(bet, minRaise), maxBet)}
            setBet={setBet}
            style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center' }}
            disabled={!myTurn}
          />
          <div style={amountStyle}>${bet?.toLocaleString?.() ?? bet}</div>
        </div>
      </div>
    </UIWrapper>
  )
}
