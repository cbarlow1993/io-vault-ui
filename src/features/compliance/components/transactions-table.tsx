import { Link } from '@tanstack/react-router';

import {
  type ComplianceTransaction,
  TRANSACTION_TYPE_LABELS,
} from '@/features/compliance';

import { RiskBadge } from './risk-badge';
import { StatusBadge } from './status-badge';

interface TransactionsTableProps {
  transactions: ComplianceTransaction[];
}

export const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Transaction Hash
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Amount
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Wallet
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Chain
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Risk
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Submitted
            </th>
            <th className="px-4 py-3 text-left font-medium text-neutral-600">
              Reviewer
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link
                  to="/compliance/transactions/$id"
                  params={{ id: tx.id }}
                  className="font-mono text-brand-600 hover:underline"
                >
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-900">
                {TRANSACTION_TYPE_LABELS[tx.type]}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900">
                {tx.amount} {tx.token}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-neutral-600">
                  {tx.type === 'receive' ? tx.fromAddress : tx.toAddress}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-600 capitalize">
                {tx.chain}
              </td>
              <td className="px-4 py-3">
                <RiskBadge level={tx.riskLevel} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {tx.submittedAt.toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {tx.reviewerId || 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
