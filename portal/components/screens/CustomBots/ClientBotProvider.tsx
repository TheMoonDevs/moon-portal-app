import React, { createContext, useContext } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';

export type ClientBot = {
  id: string;
  botProjectId: string;
  clientId: string;
  name: string;
  type: string;
  variables: any[];
  clientRequestIds: string[];
};

type ClientBotContextType = {
  clientBots: ClientBot[];
  refreshClientBots: () => Promise<any>;
  isLoading: boolean;
};

const ClientBotContext = createContext<ClientBotContextType | undefined>(
  undefined,
);

export const ClientBotProvider: React.FC<{
  clientId: string;
  botProjectId: string;
  // clientRequestId?: string;
  children: React.ReactNode;
}> = ({ clientId, botProjectId, children }) => {
  const searchParams = new URLSearchParams();
  // searchParams.append('clientId', clientId);
  searchParams.append('botProjectId', botProjectId);
  // searchParams.append('clientRequestId', clientRequestId);
  
  const { data, error, mutate, isLoading } = useSWR(
    `/api/custom-bots/client-bots?${searchParams.toString()}`,
    (url) => fetch(url).then((res) => res.json()),
  );

  if (error) {
    toast.error('Error fetching client bots.');
    console.error('ClientBot fetch error:', error);
  }
  
  const clientBots: ClientBot[] = data?.clientBots || [];

  // Enhanced refreshClientBots function that forces revalidation
  const refreshClientBots = async () => {
    try {
      // Clear cache and force revalidation
      const result = await mutate(undefined, { revalidate: true });
      return result;
    } catch (error) {
      console.error('Error refreshing client bots:', error);
      toast.error('Failed to refresh bots data');
      return null;
    }
  };

  return (
    <ClientBotContext.Provider
      value={{ clientBots, refreshClientBots, isLoading }}
    >
      {children}
    </ClientBotContext.Provider>
  );
};

export const useClientBots = () => {
  const context = useContext(ClientBotContext);
  if (!context) {
    throw new Error('useClientBots must be used within a ClientBotProvider');
  }
  return context;
};
