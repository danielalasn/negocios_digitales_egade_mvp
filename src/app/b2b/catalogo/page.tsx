'use client';

import { useMerchant } from '@/components/b2b/MerchantContext';
import { CatalogManager } from '@/components/b2b/CatalogManager';
import { PageTitle } from '@/components/b2b/ui';

export default function CatalogPage() {
  const { rest } = useMerchant();
  return (
    <div>
      <PageTitle title="Catálogo" sub="La IA compara tu foto del cierre contra estos productos." />
      <CatalogManager merchantId={rest.id} />
    </div>
  );
}
