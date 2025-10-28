import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

import Container from '../../components/layout/Container';
import Button from '../../components/buttons/Button';
import globalContext from '../../context/global/globalContext';
import gameContext from '../../context/game/gameContext';
import PokerTable from '../../components/game/PokerTable';
import { RotateDevicePrompt } from '../../components/game/RotateDevicePrompt';
import { PositionedUISlot } from '../../components/game/PositionedUISlot';
import { PokerTableWrapper } from '../../components/game/PokerTableWrapper';
import { Seat } from '../../components/game/Seat/Seat';
import { InfoPill } from '../../components/game/InfoPill';
import { GameUI } from '../../components/game/GameUI';
import { GameStateInfo } from '../../components/game/GameStateInfo';
import BrandingImage from '../../components/game/BrandingImage';
import PokerCard from '../../components/game/PokerCard';
import background from '../../assets/img/background.png';
import './PokerPlay.scss';

const PokerPlay = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { selectedTableId, setSelectedTableId } = useContext(globalContext);

  const {
    messages,
    currentTable,
    seatId,
    joinTable,    // emite CS_JOIN_TABLE dentro del GameState
    leaveTable,   // emite CS_LEAVE_TABLE dentro del GameState
    sitDown,
    standUp,
    fold,
    check,
    call,
    raise,
  } = useContext(gameContext);

  const [bet, setBet] = useState(0);
  const [winnerMessage, setWinnerMessage] = useState(null);
  const joinedRef = useRef(false);

  // Guards de navegación
  useEffect(() => {
    if (!isConnected) navigate('/', { replace: true });
  }, [isConnected, navigate]);

  useEffect(() => {
    if (selectedTableId == null) navigate('/lobby', { replace: true });
  }, [selectedTableId, navigate]);

  // Join determinista (una sola vez por montaje)
  useEffect(() => {
    if (selectedTableId == null || joinedRef.current) return;
    joinTable(selectedTableId);
    joinedRef.current = true;
    return () => {
      // safety: si se desmonta la vista, salimos de la mesa
      leaveTable();
      joinedRef.current = false;
    };
  }, [selectedTableId, joinTable, leaveTable]);

  // Bet por defecto según estado
  useEffect(() => {
    if (!currentTable) return;
    const { callAmount, minBet, pot, minRaise } = currentTable;
    if (callAmount > (minBet ?? 0)) setBet(callAmount);
    else if ((pot ?? 0) > 0) setBet(minRaise ?? minBet ?? 0);
    else setBet(minBet ?? 0);
  }, [currentTable]);

  // Mensaje de ganador temporal
  useEffect(() => {
    if (currentTable?.winMessages?.length > 0) {
      const lastWin = currentTable.winMessages.at(-1);
      setWinnerMessage(lastWin);
      const t = setTimeout(() => setWinnerMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [currentTable?.winMessages]);

  // Leave ordenado (botón)
  const handleLeave = () => {
    leaveTable();
    setSelectedTableId(null);
    navigate('/lobby', { replace: true });
  };

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
                ][i];
                return (
                  <PositionedUISlot key={n} scale="0.55" {...pos}>
                    <Seat seatNumber={n} currentTable={currentTable} sitDown={sitDown} />
                  </PositionedUISlot>
                );
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
  );
};

export default PokerPlay;
