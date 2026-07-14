import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomerListItem } from '@/api/customers.api';
import { useAuthStore } from '@/stores/authStore';
import { canDeleteCustomers, canEditCustomers } from '@/utils/permissions';

interface CustomerRowActionsProps {
  customer: CustomerListItem;
  onEdit: (customer: CustomerListItem) => void;
  onDelete: (customer: CustomerListItem) => void;
}

export function CustomerRowActions({ customer, onEdit, onDelete }: CustomerRowActionsProps) {
  const user = useAuthStore((s) => s.user);
  const canEdit = canEditCustomers(user);
  const canDelete = canDeleteCustomers(user);

  // Neither action is available — don't render a trigger that opens an empty menu.
  if (!canEdit && !canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Row actions for ${customer.firstName} ${customer.lastName}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(customer)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onClick={() => onDelete(customer)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
