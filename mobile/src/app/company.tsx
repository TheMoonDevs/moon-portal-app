import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card, Row, Screen } from '@/components/ui';
import { useCompany } from '@/lib/company';

/** Pick the company the app shows (a sheet). */
export default function CompanyScreen() {
  const { companies, company, setCompanyId } = useCompany();
  return (
    <Screen edgeTop={false}>
      <Card>
        {companies.map((c) => (
          <Row
            key={c.id}
            title={c.name}
            detail={c.isPersonal ? 'Only you can see this' : null}
            onPress={() => {
              setCompanyId(c.id);
              router.back();
            }}
            right={
              c.id === company?.id ? <ThemedText type="smallBold">✓</ThemedText> : undefined
            }
          />
        ))}
      </Card>
    </Screen>
  );
}
