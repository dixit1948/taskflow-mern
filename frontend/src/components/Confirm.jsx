import { createContext, useCallback, useContext, useState } from "react";
import Modal from "./Modal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const ask = useCallback(options => new Promise(resolve => setState({ ...options, resolve })), []);
  const close = value => {
    state.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {state && (
        <Modal
          title={state.title}
          size="sm"
          onClose={() => close(false)}
          footer={
            <>
              <button className="btn" onClick={() => close(false)}>Cancel</button>
              <button className="btn btn-danger" autoFocus onClick={() => close(true)}>
                {state.confirmLabel || "Confirm"}
              </button>
            </>
          }
        >
          <p className="muted">{state.body}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
