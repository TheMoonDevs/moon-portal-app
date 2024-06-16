'use client';
import { useSyncBalances } from '@/utils/hooks/useSyncBalances';
import {
  setReduxSelectedCurrency,
  setReduxSelectedCurrencyValue,
} from '@/utils/redux/balances/balances.slice';
import { useAppDispatch } from '@/utils/redux/store';
import { Modal } from '@mui/material';
import { useState } from 'react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({ isOpen, onClose }) => {
  const { exchange } = useSyncBalances();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedCurrencyValue, setSelectedCurrencyValue] = useState<number>(0);
  const dispatch = useAppDispatch();

  const handleCurrencyChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedCurrency(event.target.value);
    setSelectedCurrencyValue(exchange?.exchangeCurrency[event.target.value]);
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 bg-white border-2 border-midGrey shadow-lg p-4 rounded-lg text-black'>
        <div className='flex justify-between items-center'>
          <h1 className='text-lg font-bold'>Select Currency</h1>
          <button onClick={onClose} className='text-lg font-bold'>
            X
          </button>
        </div>
        <select
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          className='w-full p-2 mt-4 border-2 border-black'
        >
          <option value=''>Select one</option>
          {isOpen &&
            exchange?.exchangeCurrency &&
            Object.keys(exchange?.exchangeCurrency).map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
        </select>
        <button
          onClick={() => {
            dispatch(setReduxSelectedCurrency(selectedCurrency));
            dispatch(setReduxSelectedCurrencyValue(selectedCurrencyValue));
            onClose();
          }}
          className='w-full p-2 mt-4 text-sm font-black  text-whiteSmoke bg-black '
          disabled={!selectedCurrency || !selectedCurrencyValue}
        >
          Set Currency
        </button>
      </div>
    </Modal>
  );
};

export default CurrencyModal;
