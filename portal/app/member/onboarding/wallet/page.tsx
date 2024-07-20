import { PageAccess } from "@/components/global/PageAccess";
import CreateWallet from "@/components/screens/Members/WalletOnboarding/CreateWallet";

const CreateWalletPage = () => {
  return (
    <PageAccess isAuthRequired={true}>
      <CreateWallet />
    </PageAccess>
  );
};

export default CreateWalletPage;
