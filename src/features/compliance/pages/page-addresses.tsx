import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { AddressesTable } from '../components/addresses-table';
import { mockAddresses } from '../data/mock-addresses';

export const PageComplianceAddresses = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Addresses</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                All Addresses
              </Button>
              <Button variant="ghost" size="sm">
                Internal
              </Button>
              <Button variant="ghost" size="sm">
                External
              </Button>
              <Button variant="ghost" size="sm">
                Watchlist
              </Button>
            </div>
            <Button size="sm">Add to Watchlist</Button>
          </div>
          <AddressesTable addresses={mockAddresses} />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
