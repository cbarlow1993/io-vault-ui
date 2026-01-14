import { Link } from '@tanstack/react-router';
import { DownloadIcon, FileTextIcon } from 'lucide-react';

import {
  NotificationButton,
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/shell';

const reportTypes = [
  {
    id: 'transaction-summary',
    title: 'Transaction Summary',
    description: 'Summary of all transactions with risk assessments.',
  },
  {
    id: 'sar-report',
    title: 'SAR Report',
    description: 'Suspicious Activity Report for flagged transactions.',
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    description: 'Comprehensive risk assessment across all addresses.',
  },
];

export const PageComplianceReports = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-3">
            <NotificationButton />
          </div>
        }
      >
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link
              to="/compliance"
              className="text-neutral-500 hover:text-neutral-700"
            >
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Reports</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="py-4">
        <div className="space-y-4">
          {/* Report Generation */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Generate Reports
              </h2>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                Generate compliance reports for regulatory requirements and
                internal auditing.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-neutral-200">
              {reportTypes.map((report) => (
                <div key={report.id} className="bg-white p-3">
                  <FileTextIcon className="size-5 text-brand-600" />
                  <h3 className="mt-2 text-xs font-semibold text-neutral-900">
                    {report.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-neutral-500">
                    {report.description}
                  </p>
                  <button
                    type="button"
                    className="mt-3 flex h-7 items-center gap-1.5 bg-brand-500 px-2 text-xs font-medium text-white hover:bg-brand-600"
                  >
                    <DownloadIcon className="size-3" />
                    Generate
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-2">
              <h2 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
                Recent Reports
              </h2>
            </div>
            <div className="py-8 text-center">
              <FileTextIcon className="mx-auto size-6 text-neutral-300" />
              <p className="mt-2 text-xs text-neutral-500">
                No reports generated yet
              </p>
              <p className="text-[10px] text-neutral-400">
                Generate a report above to get started.
              </p>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
