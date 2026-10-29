import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { initialState, reducer, type Action, type RequestState } from "./requestReducer";

const StateContext = createContext<RequestState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function RequestProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useRequestState(): RequestState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useRequestState must be used within RequestProvider");
  return ctx;
}

export function useRequestDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useRequestDispatch must be used within RequestProvider");
  return ctx;
}
