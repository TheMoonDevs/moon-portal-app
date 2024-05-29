import { Switch, styled } from "@mui/material";

const StyledSwitch = styled(Switch)(({ theme }) => ({
  "& .MuiSwitch-track": {
    backgroundColor: theme.palette.background.paper,
  },
}));
const ToggleButton = ({
  isActive,
  onClick,
}: {
  isActive: boolean;
  onClick: () => void;
}) => {
  return <StyledSwitch onChange={onClick} color="info" />;
};

export default ToggleButton;
