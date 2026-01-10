import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

import { TransactionsTable } from '../components/transactions-table';
import { mockTransactions } from '../data/mock-transactions';

export const PageComplianceTransactions = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Transactions</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              All
            </Button>
            <Button variant="ghost" size="sm">
              Pending L1
            </Button>
            <Button variant="ghost" size="sm">
              Pending L2
            </Button>
            <Button variant="ghost" size="sm">
              Under Review
            </Button>
            <Button variant="ghost" size="sm">
              Approved
            </Button>
            <Button variant="ghost" size="sm">
              Rejected
            </Button>
          </div>
          <TransactionsTable transactions={mockTransactions} />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
