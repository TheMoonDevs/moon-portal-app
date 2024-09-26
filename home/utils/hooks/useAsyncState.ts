import { useState } from "react";

const useAsyncState = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState({ isError: false, description: "" });

  const resetState = () => {
    setLoading(false);
    setSuccess(false);
    setError({ isError: false, description: "" });
  };

  return {
    loading,
    success,
    error,
    setLoading,
    setSuccess,
    setError,
    resetState,
  };
};

export default useAsyncState;
