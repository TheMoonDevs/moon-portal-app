import { PayTransactions, User, UserReferrals } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DbState {
  fetchedReferralData: UserReferrals[];
  payTransaction: PayTransactions[];
  claimTransactions: PayTransactions[];
  refreshPayTransactions: boolean;
}

const initialState: DbState = {
  fetchedReferralData: [],
  payTransaction: [],
  claimTransactions: [],
  refreshPayTransactions: false,
};

const dbSlice = createSlice({
  name: "db",
  initialState,
  reducers: {
    addClaimTransaction: (state, action) => {
      state.claimTransactions.push(action.payload);
    },
    setClaimTransactions: (state, action) => {
      state.claimTransactions = action.payload;
    },
    setPayTransactions: (state, action) => {
      state.payTransaction = action.payload;
    },
    setRefreshPayTransactions: (state, action) => {
      state.refreshPayTransactions = !state.refreshPayTransactions;
    },
    setFetchedReferralData: (state, action) => {
      state.fetchedReferralData = action.payload;
    },
    updateReferralData: (state, action) => {
      state.fetchedReferralData = state.fetchedReferralData.map((referral) => {
        console.log(action.payload.id, referral.id);
        if (referral.id === action.payload.id) {
          return action.payload;
        }
        return referral;
      });
    },

    addReferralData: (state, action) => {
      state.fetchedReferralData = [
        action.payload,
        ...state.fetchedReferralData,
      ];
    },
  },
});

export const {
  setPayTransactions,
  setRefreshPayTransactions,
  setFetchedReferralData,
  updateReferralData,
  addReferralData,
  addClaimTransaction,
  setClaimTransactions,
} = dbSlice.actions;

export default dbSlice.reducer;
