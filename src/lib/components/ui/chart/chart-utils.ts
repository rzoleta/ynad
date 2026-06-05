import { getContext, setContext, type Component } from 'svelte';

export type ChartConfig = Record<
  string,
  {
    label?: string;
    icon?: Component;
    color?: string;
    theme?: {
      light: string;
      dark: string;
    };
  }
>;

type ChartContext = {
  config: ChartConfig;
};

const CHART_CONTEXT_KEY = Symbol('chart');

export function setChartContext(context: ChartContext) {
  setContext(CHART_CONTEXT_KEY, context);
}

export function getChartContext() {
  return getContext<ChartContext>(CHART_CONTEXT_KEY);
}
