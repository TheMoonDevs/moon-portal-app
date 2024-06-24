import React from 'react';
import { List, ListItem, ListItemText, Popover } from '@mui/material';
import { useSyncBalances } from '@/utils/hooks/useSyncBalances';

interface CustomPopoverProps {
  popoverProps: {
    id: string | undefined;
    open: boolean;
    anchorEl: HTMLButtonElement | null;
    onClose: () => void;
  };
  handleCurrencySelect: (currency: string, value: number) => void;
}

const CurrencySelectPopover: React.FC<CustomPopoverProps> = ({
  popoverProps,
  handleCurrencySelect,
}) => {
  const { id, open, anchorEl, onClose } = popoverProps;
  const { exchange } = useSyncBalances();
  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <List
        sx={{
          width: '100%',
          maxWidth: 360,
          bgcolor: 'background.paper',
          maxHeight: '200px',
          overflow: 'auto',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        {exchange &&
          Object.entries(exchange.exchangeCurrency).map(([currency, value]) => (
            <ListItem
              key={currency}
              disablePadding
              onClick={() => handleCurrencySelect(currency, value as number)}
              sx={{
                padding: '0.5rem',
                cursor: 'pointer',
                '&:hover': {
                  background: '#f0f0f0',
                },
              }}
            >
              <ListItemText
                primary={`1 TMD === ${(
                  (Number(value) *
                    (exchange?.exchangeData?.creditsRateINR ?? 0)) /
                  exchange.exchangeCurrency.INR
                ).toFixed(2)} ${currency}`}
              />
            </ListItem>
          ))}
      </List>
    </Popover>
  );
};

export default CurrencySelectPopover;
