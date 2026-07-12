import { Badge } from '@/components/ui/badge';
import { EnquiryStatus } from '@/api/enquiries.api';

const STATUS_CLASSES: Record<EnquiryStatus, string> = {
  New: 'border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Quoted: 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Booked: 'border-green-200 bg-green-100 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  Closed: 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
};

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge className={STATUS_CLASSES[status]}>{status}</Badge>;
}
