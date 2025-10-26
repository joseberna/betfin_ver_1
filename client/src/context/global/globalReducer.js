export default (state, action) => {
  switch (action.type) {
    case 'SET_WALLET_ADDRESS':
      return {
        ...state,
        walletAddress: action.payload,
      }
    case 'SET_CHIPS_AMOUNT':
      return {
        ...state,
        chipsAmount: action.payload,
      }
    default:
      return state
  }
}
