import * as React from 'react';
import { shallow } from 'enzyme';
import Measure from 'react-measure';
import { GraphEmpty } from '@console/internal/components/graphs/graph-empty';
import { DEFAULT_PROMETHEUS_TIMESPAN } from '@console/internal/components/graphs';
import { parsePrometheusDuration } from '@console/internal/components/utils/datetime';
import { LoadingInline } from '@console/internal/components/utils';
import * as hookUtils from '../../hooks';
import { DEFAULT_REFRESH_INTERVAL } from '../../const';
import { PipelineExampleNames, pipelineTestData } from '../../../../test-data/pipeline-data';
import PipelineSuccessRatioDonut from '../PipelineSuccessRatioDonut';
import SuccessRatioDonut from '../charts/successRatioDonut';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';

jest.mock('@console/internal/components/utils/k8s-get-hook', () => ({
  useK8sGet: jest.fn(),
}));

jest.mock('react-i18next', () => {
  const reactI18next = require.requireActual('react-i18next');
  return {
    ...reactI18next,
    useTranslation: () => ({ t: (key) => key }),
  };
});

const usePipelineRunTaskRunPollSpy = jest.spyOn(hookUtils, 'usePipelineSuccessRatioPoll');

const mockData = pipelineTestData[PipelineExampleNames.WORKSPACE_PIPELINE];
const { pipeline } = mockData;

type PipelineSuccessRatioDonutProps = React.ComponentProps<typeof PipelineSuccessRatioDonut>;

describe('Pipeline Success Ratio Graph', () => {
  let PipelineSuccessRatioDonutProps: PipelineSuccessRatioDonutProps;
  beforeEach(() => {
    PipelineSuccessRatioDonutProps = {
      pipeline,
      timespan: DEFAULT_PROMETHEUS_TIMESPAN,
      interval: parsePrometheusDuration(DEFAULT_REFRESH_INTERVAL),
    };
  });

  it('Should render an LoadingInline if query result is loading', () => {
    usePipelineRunTaskRunPollSpy.mockReturnValue([{ data: { result: [{ x: 'x' }] } }, false, true]);
    const PipelineSuccessRatioDonutWrapper = shallow(
      <PipelineSuccessRatioDonut {...PipelineSuccessRatioDonutProps} />,
    );
    expect(PipelineSuccessRatioDonutWrapper.find(LoadingInline).exists()).toBe(true);
  });

  it('Should render an empty state if query result is empty', () => {
    usePipelineRunTaskRunPollSpy.mockReturnValue([{ data: { result: [] } }, false, false]);
    const PipelineSuccessRatioDonutWrapper = shallow(
      <PipelineSuccessRatioDonut {...PipelineSuccessRatioDonutProps} />,
    );
    expect(PipelineSuccessRatioDonutWrapper.find(GraphEmpty).exists()).toBe(true);
  });

  it('Should render an empty state if query resulted in error', () => {
    usePipelineRunTaskRunPollSpy.mockReturnValue([{ data: { result: [] } }, true, false]);
    const PipelineSuccessRatioDonutWrapper = shallow(
      <PipelineSuccessRatioDonut {...PipelineSuccessRatioDonutProps} />,
    );
    expect(PipelineSuccessRatioDonutWrapper.find(GraphEmpty).exists()).toBe(true);
  });

  it('Should render an TimeSeriesChart and SuccessRatioDonut if data is available', () => {
    usePipelineRunTaskRunPollSpy.mockReturnValue([
      { data: { result: [{ x: Date.now(), y: 1 }] } },
      false,
      false,
    ]);
    const PipelineSuccessRatioDonutWrapper = shallow(
      <PipelineSuccessRatioDonut {...PipelineSuccessRatioDonutProps} />,
    );
    expect(PipelineSuccessRatioDonutWrapper.find(SuccessRatioDonut).exists()).toBe(true);
    expect(PipelineSuccessRatioDonutWrapper.find(LoadingInline).exists()).toBe(false);
    expect(PipelineSuccessRatioDonutWrapper.find(GraphEmpty).exists()).toBe(false);
    expect(
      PipelineSuccessRatioDonutWrapper.find(Measure)
        .dive()
        .dive()
        .find(TimeSeriesChart)
        .exists(),
    ).toBe(true);
  });
});
