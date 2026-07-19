import { chartColorForRank } from '$lib/charts/colors';

export const GITHUB_URL = 'https://github.com/rzoleta/ynad';

export type SampleLinePoint = { label: string; value: number };
export type SampleStackedGroup = { key: string; label: string; color: string };
export type SampleStackedRow = { label: string } & Record<string, string | number>;
export type SamplePieSlice = { key: string; label: string; value: number; fill: string };

export type SampleChartSpec =
  | { kind: 'line'; title: string; color: string; points: SampleLinePoint[] }
  | { kind: 'stacked-bar'; title: string; groups: SampleStackedGroup[]; rows: SampleStackedRow[] }
  | { kind: 'pie'; title: string; slices: SamplePieSlice[] };

// All values are milliunits (USD), same unit the app renders.
export const netWorthChart: SampleChartSpec = {
  kind: 'line',
  title: 'Net Worth',
  color: chartColorForRank(1),
  points: [
    { label: 'Aug', value: 52_400_000 },
    { label: 'Sep', value: 55_130_000 },
    { label: 'Oct', value: 54_210_000 },
    { label: 'Nov', value: 58_940_000 },
    { label: 'Dec', value: 61_520_000 },
    { label: 'Jan', value: 60_870_000 },
    { label: 'Feb', value: 65_310_000 },
    { label: 'Mar', value: 68_040_000 },
    { label: 'Apr', value: 71_960_000 },
    { label: 'May', value: 75_420_000 },
    { label: 'Jun', value: 79_830_000 },
    { label: 'Jul', value: 84_214_000 }
  ]
};

export const spendingChart: SampleChartSpec = {
  kind: 'stacked-bar',
  title: 'Monthly Spending',
  groups: [
    { key: 'housing', label: 'Housing', color: chartColorForRank(1) },
    { key: 'food', label: 'Food', color: chartColorForRank(2) },
    { key: 'transport', label: 'Transport', color: chartColorForRank(3) },
    { key: 'lifestyle', label: 'Lifestyle', color: chartColorForRank(4) }
  ],
  rows: [
    { label: 'Feb', housing: 1_650_000, food: 720_000, transport: 240_000, lifestyle: 310_000 },
    { label: 'Mar', housing: 1_650_000, food: 680_000, transport: 280_000, lifestyle: 420_000 },
    { label: 'Apr', housing: 1_720_000, food: 745_000, transport: 260_000, lifestyle: 380_000 },
    { label: 'May', housing: 1_650_000, food: 810_000, transport: 305_000, lifestyle: 450_000 },
    { label: 'Jun', housing: 1_650_000, food: 760_000, transport: 275_000, lifestyle: 520_000 },
    { label: 'Jul', housing: 1_720_000, food: 705_000, transport: 290_000, lifestyle: 365_000 }
  ]
};

export const categoryPieChart: SampleChartSpec = {
  kind: 'pie',
  title: 'Spending by Category',
  slices: [
    { key: 'rent', label: 'Rent', value: 1_720_000, fill: chartColorForRank(1) },
    { key: 'groceries', label: 'Groceries', value: 486_000, fill: chartColorForRank(2) },
    { key: 'transport', label: 'Transport', value: 290_000, fill: chartColorForRank(3) },
    { key: 'dining', label: 'Dining', value: 219_000, fill: chartColorForRank(4) },
    { key: 'other', label: 'Other', value: 240_000, fill: chartColorForRank(9) }
  ]
};

export const sampleNumbers = {
  netWorth: 84_214_090,
  spendingThisMonth: 2_955_710,
  avgMonthlyIncome: 6_250_000
};
