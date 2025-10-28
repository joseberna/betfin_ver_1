export type GameType = 'poker' | 'blackjack';

export interface LobbyTable {
    id: number;
    name: string;
    gameType: GameType;
    maxPlayers: number;
    currentNumPlayers: number;
    limit: number;
    smallBlind?: number;
    bigBlind?: number;
}

export interface JoinPayload {
    tableId: number;
    gameType: GameType;
    walletAddress: string;
    username?: string;
}