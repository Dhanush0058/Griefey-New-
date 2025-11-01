import { ComplaintCategory } from './types';

export const CATEGORIES: ComplaintCategory[] = [
  'Sanitation',
  'Electricity',
  'Roads',
  'Water Supply',
  'Other',
];

export const SUBCATEGORIES: Record<ComplaintCategory, string[]> = {
    'Sanitation': ['Garbage overflowing', 'Street not swept', 'Dead animal', 'Drainage issue'],
    'Electricity': ['Street light not working', 'Power outage', 'Exposed wires', 'Transformer issue'],
    'Roads': ['Potholes', 'Damaged footpath', 'Illegal encroachment', 'Poor road quality'],
    'Water Supply': ['No water', 'Leaking pipe', 'Contaminated water', 'Low pressure'],
    'Other': [],
};
