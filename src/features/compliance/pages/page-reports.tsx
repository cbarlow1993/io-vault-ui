import { Link } from '@tanstack/react-router';
import { FileTextIcon, DownloadIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/treasury-6';

export const PageComplianceReports = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-neutral-500 hover:text-neutral-700">
              Compliance
            </Link>
            <span className="text-neutral-400">/</span>
            <span>Reports</span>
          </div>
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="space-y-6">
          {/* Report Generation */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Generate Reports
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Generate compliance reports for regulatory requirements and
              internal auditing.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-4">
                <FileTextIcon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 font-semibold text-neutral-900">
                  Transaction Summary
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Summary of all transactions with risk assessments.
                </p>
                <Button size="sm" className="mt-4">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <FileTextIcon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 font-semibold text-neutral-900">
                  SAR Report
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Suspicious Activity Report for flagged transactions.
                </p>
                <Button size="sm" className="mt-4">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <FileTextIcon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 font-semibold text-neutral-900">
                  Risk Assessment
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Comprehensive risk assessment across all addresses.
                </p>
                <Button size="sm" className="mt-4">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Recent Reports
            </h2>
            <div className="mt-4">
              <div className="py-12 text-center text-neutral-500">
                <FileTextIcon className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="mt-2">No reports generated yet</p>
                <p className="text-sm">
                  Generate a report above to get started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
