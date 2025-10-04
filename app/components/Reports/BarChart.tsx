import { ResponsiveBar } from "@nivo/bar";

interface BarChartProps {
  data: any[];
  keys: string[];
  indexBy: string;
  axisBottomLabel: string;
  axisLeftLabel: string;
  colors?: any;
  rotateLabels?: boolean;
}

const BarChart = ({
  data,
  keys,
  indexBy,
  axisBottomLabel,
  axisLeftLabel,
  colors = { scheme: "set2" },
  rotateLabels = true,
}: BarChartProps) => {
  return (
    <div style={{ height: 400 }}>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
        padding={0.3}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={colors}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: rotateLabels ? -45 : 0,
          legend: axisBottomLabel,
          legendPosition: "middle",
          legendOffset: 60,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: axisLeftLabel,
          legendPosition: "middle",
          legendOffset: -50,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="#fff"
        animate={true}
        motionConfig="gentle"
        role="application"
      />
    </div>
  );
};

export default BarChart;
