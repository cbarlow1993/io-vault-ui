import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircleIcon,
  ArrowRightLeftIcon,
  BellIcon,
  CheckCircle2Icon,
  ClockIcon,
  InfoIcon,
  KeyIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import {
  getAllPendingOperations,
  type PendingOperation,
} from '@/features/vaults/data/vaults';

type NotificationType = 'info' | 'warning' | 'success' | 'transaction';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const notifications: Notification[] = [
  {
    id: '1',
    type: 'transaction',
    title: 'Payment Pending Approval',
    message: 'Wire transfer of $2,500,000 to Acme Corp requires your approval',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'FX Rate Alert',
    message: 'EUR/USD has moved beyond your threshold (1.0850)',
    time: '15 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: 'Transfer Completed',
    message: 'Incoming wire from Global Industries ($3,200,000) settled',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '4',
    type: 'info',
    title: 'Daily Report Ready',
    message: 'Your treasury position report for Jan 8 is available',
    time: '2 hours ago',
    read: true,
  },
  {
    id: '5',
    type: 'transaction',
    title: 'Batch Payment Scheduled',
    message: '12 payments totaling $845,000 scheduled for tomorrow',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '6',
    type: 'warning',
    title: 'Low Balance Alert',
    message: 'CHF account balance below minimum threshold',
    time: '5 hours ago',
    read: true,
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return AlertCircleIcon;
    case 'success':
      return CheckCircle2Icon;
    case 'transaction':
      return ArrowRightLeftIcon;
    default:
      return InfoIcon;
  }
};

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return 'bg-amber-50 text-amber-600';
    case 'success':
      return 'bg-emerald-50 text-emerald-600';
    case 'transaction':
      return 'bg-blue-50 text-blue-600';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
};

type TabType = 'all' | 'pending' | 'alerts';

// Progress bar component for pending operations
const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const percentage = Math.round((current / total) * 100);
  const isComplete = current >= total;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-500">
        <span>
          {current} of {total} approvals
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-neutral-200">
        <div
          className={cn(
            'h-full transition-all duration-500',
            isComplete ? 'bg-emerald-500' : 'bg-blue-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Pending operation item component
const PendingOperationItem = ({
  operation,
  onNavigate,
}: {
  operation: PendingOperation;
  onNavigate: (operationId: string) => void;
}) => {
  const approvedCount = operation.approvals.filter((a) => a.approved).length;
  const Icon = operation.type === 'signature' ? KeyIcon : RefreshCwIcon;

  return (
    <div
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-neutral-50"
      onClick={() => onNavigate(operation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onNavigate(operation.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center',
            operation.type === 'signature'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-purple-50 text-purple-600'
          )}
        >
          <Icon className="size-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-neutral-900">
              {operation.type === 'signature'
                ? 'Signature Request'
                : 'Reshare Request'}
            </p>
            <span
              className={cn(
                'shrink-0 px-1.5 py-0.5 text-[10px] font-medium',
                approvedCount >= operation.threshold
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              )}
            >
              {approvedCount >= operation.threshold ? 'Ready' : 'Pending'}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
            {operation.description}
          </p>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            {operation.vaultName}
          </p>
          <ProgressBar current={approvedCount} total={operation.threshold} />
          <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400">
            <ClockIcon className="size-3" />
            <span>Requested by {operation.requestedBy}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationList, setNotificationList] = useState(notifications);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);

  // Load and simulate real-time updates for pending operations
  useEffect(() => {
    setPendingOps(getAllPendingOperations());

    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setPendingOps((prev) =>
        prev.map((op) => {
          // Randomly approve one pending signer (for demo purposes)
          const pendingApprovals = op.approvals.filter((a) => !a.approved);
          if (pendingApprovals.length > 0 && Math.random() > 0.7) {
            const randomIndex = Math.floor(
              Math.random() * pendingApprovals.length
            );
            const signerToApprove = pendingApprovals[randomIndex];
            if (!signerToApprove) return op;
            return {
              ...op,
              approvals: op.approvals.map((a) =>
                a.signerId === signerToApprove.signerId
                  ? {
                      ...a,
                      approved: true,
                      approvedAt: new Date().toISOString(),
                    }
                  : a
              ),
            };
          }
          return op;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notificationList.filter((n) => !n.read).length;
  const pendingCount = pendingOps.filter(
    (op) => op.approvals.filter((a) => a.approved).length < op.threshold
  ).length;

  const handleNavigateToOperation = (operationId: string) => {
    setIsOpen(false);
    navigate({ to: '/operations/$operationId', params: { operationId } });
  };

  const markAsRead = (id: string) => {
    setNotificationList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-none p-0 hover:bg-neutral-100"
        >
          <BellIcon className="size-4 text-neutral-600" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="bg-red-500 absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[400px] rounded-none border-neutral-200 p-0 font-inter sm:max-w-[400px]"
      >
        <SheetHeader className="border-b border-neutral-200 px-4 py-3 pr-12">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-neutral-900">
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-auto rounded-none px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-transparent hover:text-neutral-900"
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Filter tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 px-4 py-2 text-xs font-medium transition-colors',
              activeTab === 'all'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={cn(
              'relative flex-1 px-4 py-2 text-xs font-medium transition-colors',
              activeTab === 'pending'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            Pending
            {pendingCount > 0 && (
              <span className="bg-blue-500 ml-1 inline-flex h-4 min-w-[16px] items-center justify-center px-1.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={cn(
              'flex-1 px-4 py-2 text-xs font-medium transition-colors',
              activeTab === 'alerts'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-600'
            )}
          >
            Alerts
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {/* Pending operations tab */}
          {activeTab === 'pending' && (
            <>
              {pendingOps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                  <KeyIcon className="mb-2 size-8" strokeWidth={1} />
                  <p className="text-sm">No pending operations</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {pendingOps.map((operation) => (
                    <PendingOperationItem
                      key={operation.id}
                      operation={operation}
                      onNavigate={handleNavigateToOperation}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* All notifications tab */}
          {activeTab === 'all' && (
            <>
              {notificationList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                  <BellIcon className="mb-2 size-8" strokeWidth={1} />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notificationList.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'group relative px-4 py-3 transition-colors hover:bg-neutral-50',
                          !notification.read && 'bg-blue-50/30'
                        )}
                        onClick={() => markAsRead(notification.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            markAsRead(notification.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center',
                              getNotificationStyles(notification.type)
                            )}
                          >
                            <Icon className="size-4" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-neutral-900">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="bg-blue-500 mt-1.5 size-2 shrink-0 rounded-full" />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                              {notification.message}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
                              <ClockIcon className="size-3" />
                              <span>{notification.time}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="absolute top-2 right-2 rounded-none p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200"
                        >
                          <XIcon className="size-3 text-neutral-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Alerts tab - show only warning notifications */}
          {activeTab === 'alerts' && (
            <>
              {notificationList.filter((n) => n.type === 'warning').length ===
              0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                  <AlertCircleIcon className="mb-2 size-8" strokeWidth={1} />
                  <p className="text-sm">No alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notificationList
                    .filter((n) => n.type === 'warning')
                    .map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            'group relative px-4 py-3 transition-colors hover:bg-neutral-50',
                            !notification.read && 'bg-blue-50/30'
                          )}
                          onClick={() => markAsRead(notification.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              markAsRead(notification.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex gap-3">
                            <div
                              className={cn(
                                'flex size-8 shrink-0 items-center justify-center',
                                getNotificationStyles(notification.type)
                              )}
                            >
                              <Icon className="size-4" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-neutral-900">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="bg-blue-500 mt-1.5 size-2 shrink-0 rounded-full" />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                                {notification.message}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
                                <ClockIcon className="size-3" />
                                <span>{notification.time}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                            className="absolute top-2 right-2 rounded-none p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200"
                          >
                            <XIcon className="size-3 text-neutral-400" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-none border-neutral-200 text-xs font-medium"
          >
            View All Notifications
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
