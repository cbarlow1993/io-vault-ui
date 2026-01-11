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
    <div className="border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
            <th className="px-3 py-2 font-medium text-neutral-500">
              Transaction Hash
            </th>
            <th className="px-3 py-2 font-medium text-neutral-500">Type</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Amount</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Wallet</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Chain</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Risk</th>
            <th className="px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="px-3 py-2 font-medium text-neutral-500">
              Submitted
            </th>
            <th className="px-3 py-2 font-medium text-neutral-500">Reviewer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="cursor-pointer hover:bg-neutral-50">
              <td className="px-3 py-2">
                <Link
                  to="/compliance/transactions/$id"
                  params={{ id: tx.id }}
                  className="font-mono text-brand-600 hover:underline"
                >
                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                </Link>
              </td>
              <td className="px-3 py-2 text-neutral-900">
                {TRANSACTION_TYPE_LABELS[tx.type]}
              </td>
              <td className="px-3 py-2 font-medium text-neutral-900 tabular-nums">
                {tx.amount} {tx.token}
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-neutral-600">
                  {tx.type === 'receive' ? tx.fromAddress : tx.toAddress}
                </span>
              </td>
              <td className="px-3 py-2 text-neutral-600 capitalize">
                {tx.chain}
              </td>
              <td className="px-3 py-2">
                <RiskBadge level={tx.riskLevel} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={tx.status} />
              </td>
              <td className="px-3 py-2 text-neutral-500 tabular-nums">
                {tx.submittedAt.toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-neutral-600">
                {tx.reviewerId || 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
