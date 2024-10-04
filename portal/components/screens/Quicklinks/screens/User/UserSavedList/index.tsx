import UserSavedDirectories from "./UserSavedDirectories";
import UserSavedLinks from "./UserSavedLinks";

const UserSavedList = () => {
  return (
    <div>
      <UserSavedLinks />
      <UserSavedDirectories />
    </div>
  );
};

export default UserSavedList;
