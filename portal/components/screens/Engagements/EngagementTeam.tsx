import ToolTip from '@/components/elements/ToolTip';
import { Avatar, AvatarGroup } from '@mui/material';
import { Engagement, User } from '@prisma/client';

export const EngagementTeam = ({
  team,
  activeEngagement,
  isCompact,
}: {
  team: User[];
  isCompact?: boolean;
  activeEngagement: Engagement | null;
}) => {
  return (
    <AvatarGroup
      max={isCompact ? 3 : 4}
      sx={{
        '& .MuiAvatar-root': {
          width: isCompact ? 24 : 32,
          height: isCompact ? 24 : 32,
          fontSize: isCompact ? 12 : 14,
        },
      }}
    >
      {team
        .filter((user) => activeEngagement?.developer_ids?.includes(user.id))
        .map((user) => (
          <ToolTip key={user.id} title={user.name || ''}>
            <Avatar
              src={user.avatar || '/images/avatar.png'}
              alt={user.name || ''}
              sx={{ width: isCompact ? 24 : 32, height: isCompact ? 24 : 32 }}
            />
          </ToolTip>
        ))}
    </AvatarGroup>
  );
};
