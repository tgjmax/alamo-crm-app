import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const NONE = '__none__';

export interface TargetField {
  key: string;
  label: string;
  required?: boolean;
}

export type ColumnMapping = Record<string, string | undefined>;

interface ColumnMapperProps {
  sourceHeaders: string[];
  targetFields: TargetField[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

export default function ColumnMapper({ sourceHeaders, targetFields, mapping, onChange }: ColumnMapperProps) {
  function handleSelect(targetKey: string, value: string) {
    onChange({ ...mapping, [targetKey]: value === NONE ? undefined : value });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target Field</TableHead>
          <TableHead>Source Column</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targetFields.map((field) => (
          <TableRow key={field.key}>
            <TableCell>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </TableCell>
            <TableCell>
              <Select value={mapping[field.key] ?? NONE} onValueChange={(v) => handleSelect(field.key, v)}>
                <SelectTrigger aria-label={`Map ${field.label}`} className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— none —</SelectItem>
                  {sourceHeaders.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
