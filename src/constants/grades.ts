export interface GradeOption {
  label: string;
  value: string;
}

export const GRADE_OPTIONS: GradeOption[] = [
  { label: 'Daycare', value: 'Daycare' },
  { label: 'Nursery 1', value: 'Nursery1' },
  { label: 'Nursery 2', value: 'Nursery2' },
  { label: 'Kindergarten 1 (KG1)', value: 'KG1' },
  { label: 'Kindergarten 2 (KG2)', value: 'KG2' },
  { label: 'Primary 1 (Class 1)', value: '1' },
  { label: 'Primary 2 (Class 2)', value: '2' },
  { label: 'Primary 3 (Class 3)', value: '3' },
  { label: 'Primary 4 (Class 4)', value: '4' },
  { label: 'Primary 5 (Class 5)', value: '5' },
  { label: 'Primary 6 (Class 6)', value: '6' },
  { label: 'JHS 1 (Basic 7)', value: '7' },
  { label: 'JHS 2 (Basic 8)', value: '8' },
  { label: 'JHS 3 (Basic 9)', value: '9' },
];
