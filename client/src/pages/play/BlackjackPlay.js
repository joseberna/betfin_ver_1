// client/src/pages/play/BlackjackPlay.js
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import socketContext from '../../context/websocket/socketContext';
import globalContext from '../../context/global/globalContext';

const EV = {
  JOIN: 'CS_TABLE_JOIN',
  LEAVE: 'CS_TABLE_LEAVE',
  STATE: 'SC_TABLE_UPDATED',
  RESULT: 'SC_HAND_RESULT',
  ACTION: 'CS_BJ_ACTION',
};

const Card = ({ c }) => {
  if (!c) return null;
  const hidden = c.hidden;
  return (
    <div style={{
      width: 56, height: 80, borderRadius: 10,
      background: hidden ? 'linear-gradient(135deg,#133,#022)' : '#fff',
      border: '1px solid rgba(0,0,0,.2)',
      display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: 18,
      boxShadow: '0 8px 18px rgba(0,0,0,.25)'
    }}>
      {!hidden && <span style={{ color: (c.suit==='♥' || c.suit==='♦') ? '#d33' : '#111' }}>
        {c.rank}{c.suit}
      </span>}
    </div>
  );
};

const Hand = ({ title, total, cards, highlight }) => (
  <div style={{ padding: 12, borderRadius: 14, background: highlight ? 'rgba(32,201,151,.08)' : 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
      <div style={{ opacity:.8 }}>{title}</div>
      <div style={{ fontWeight:800 }}>{total ?? '-'}</div>
    </div>
    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
      {(cards||[]).map((c,i)=><Card key={i} c={c} />)}
    </div>
  </div>
);

const btn = (disabled) => ({
  padding:'8px 14px',
  borderRadius:10,
  border: disabled ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(255,255,255,.15)',
  background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)',
  color:'#e9fef9',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight:700,
  opacity: disabled ? .5 : 1
});

export default function BlackjackPlay() {
  const navigate = useNavigate();
  const { blackjack } = useContext(socketContext);
  const { selectedTableId, setSelectedTableId } = useContext(globalContext);
  const { address, isConnected } = useAccount();

  const [state, setState] = useState(null);     // snapshot de mesa
  const [result, setResult] = useState(null);   // resultado de mano (opcional UI)
  const [bet/*, setBet*/] = useState(10);       // el server actual no consume BET

  const me = useMemo(() => {
    if (!state?.players || !address) return null;
    return state.players.find(p => (p.address || p.socketId)?.toLowerCase?.() === address.toLowerCase());
  }, [state, address]);

  useEffect(() => { if (!isConnected) navigate('/', { replace:true }); }, [isConnected, navigate]);
  useEffect(() => { if (!selectedTableId) navigate('/lobby', { replace:true }); }, [selectedTableId, navigate]);

  // Join + listeners
  useEffect(() => {
    if (!blackjack || !selectedTableId) return;

    const join = () => blackjack.emit?.(EV.JOIN, { tableId: selectedTableId });
    const onState = ({ table }) => { setState(table); };              // server envía { table: snapshot }
    const onResult = (payload) => setResult(payload);
    const onError = (msg) => console.warn('[BJ][error]', msg);

    if (blackjack.connected) join();
    blackjack.on('connect', join);
    blackjack.on(EV.STATE, onState);
    blackjack.on(EV.RESULT, onResult);
    blackjack.on('SC_ERROR', onError);

    return () => {
      try { blackjack.emit?.(EV.LEAVE, { tableId: selectedTableId }); } catch {}
      blackjack.off('connect', join);
      blackjack.off(EV.STATE, onState);
      blackjack.off(EV.RESULT, onResult);
      blackjack.off('SC_ERROR', onError);
    };
  }, [blackjack, selectedTableId]);

  const sendAction = useCallback((action) => {
    if (!blackjack?.emit || !selectedTableId) return;
    blackjack.emit(EV.ACTION, { tableId: selectedTableId, action });
  }, [blackjack, selectedTableId]);

  const leave = useCallback(() => {
    try { blackjack?.emit?.(EV.LEAVE, { tableId: selectedTableId }); } catch {}
    setSelectedTableId(null);
    navigate('/lobby', { replace:true });
  }, [blackjack, selectedTableId, navigate, setSelectedTableId]);

  const stage   = state?.stage; // 'betting' | 'dealing' | 'playing' | 'settlement'
  const dealer  = state?.dealer;
  const players = state?.players || [];
  const canAct  = stage === 'playing' && me?.isMyTurn;

  return (
    <div style={{
      minHeight:'100vh',
      background: 'radial-gradient(70% 70% at 50% 0%, #0a312c 0%, #071716 45%, #050b0a 100%)',
      color:'#e9fef9'
    }}>
      {/* Header */}
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontWeight:800,letterSpacing:.3}}>Blackjack</div>
          <div style={{opacity:.6,fontSize:12}}>
            Wallet: {address ? `${address.slice(0,6)}…${address.slice(-4)}` : '-'}
          </div>
        </div>
        <div style={{display:'flex',gap:12, alignItems:'center'}}>
          <div style={{opacity:.7,fontSize:13}}>
            Table: <b>{selectedTableId}</b> • Stage: <b>{stage ?? '-'}</b>
          </div>
          <button onClick={leave} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'#e9fef9', cursor:'pointer' }}>Leave</button>
        </div>
      </header>

      {/* Mesa */}
      <main style={{maxWidth:1100, margin:'18px auto', padding:'0 24px', display:'grid', gap:18}}>
        {/* Dealer */}
        <Hand title="Dealer" total={dealer?.total} cards={dealer?.cards} />

        {/* Jugadores */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
          {players.map(p => (
            <div key={p.id || p.socketId} style={{ border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:12, background:'rgba(255,255,255,.03)' }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <img
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${(p.address||p.socketId||'p').slice(-6)}`}
                    alt="" style={{width:26,height:26,borderRadius:'50%',border:'1px solid rgba(255,255,255,.2)'}} />
                  <div style={{fontWeight:700}}>{p.username ?? (p.address ? `${p.address.slice(0,6)}…${p.address.slice(-4)}` : 'Player')}</div>
                </div>
                <div style={{display:'flex',gap:12, opacity:.8,fontSize:13}}>
                  {typeof p.bet === 'number' && <span>Bet: {p.bet}</span>}
                  {typeof p.stack === 'number' && <span>Stack: {p.stack}</span>}
                </div>
              </div>
              <Hand title="Hand" total={p.total} cards={p.cards} highlight={me && (p.id===me?.id || p.socketId===me?.socketId) && canAct} />
            </div>
          ))}
        </div>

        {/* Barra de acciones */}
        <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:12}}>
          {/* Nota: tu server aún no procesa "BET". Mantengo los controles de juego. */}
          <button disabled={!canAct} onClick={()=>sendAction('HIT')}      style={btn(!canAct)}>Hit</button>
          <button disabled={!canAct} onClick={()=>sendAction('STAND')}    style={btn(!canAct)}>Stand</button>
          <button disabled={!canAct} onClick={()=>sendAction('DOUBLE')}   style={btn(!canAct)}>Double</button>
          <button disabled={!canAct} onClick={()=>sendAction('SPLIT')}    style={btn(!canAct)}>Split</button>
        </div>

        {result && (
          <div style={{opacity:.9,fontWeight:700}}>
            {/* Puedes renderizar mensajes del result si lo necesitas */}
          </div>
        )}
      </main>
    </div>
  );
}
