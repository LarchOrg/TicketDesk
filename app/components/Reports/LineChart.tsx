import { ResponsiveLine } from "@nivo/line";

interface LineChartProps {
  data: any[];
  axisBottomLabel: string;
  axisLeftLabel: string;
  colors?: any;
  rotateLabels?: boolean;
}

const LineChart = ({
  data,
  axisBottomLabel,
  axisLeftLabel,
  colors = { scheme: "category10" },
  rotateLabels = true,
}: LineChartProps) => {
  return (
    <div style={{ height: 400 }}>
      <ResponsiveLine
        data={data}
        margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          legend: axisBottomLabel,
          tickRotation: rotateLabels ? -45 : 0,
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: axisLeftLabel,
          legendPosition: "middle",
          legendOffset: -50,
        }}
        colors={colors}
        pointSize={8}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        enableArea={true}
        enableSlices="x"
        useMesh={true}
        animate={true}
        motionConfig="gentle"
        role="application"
      />
    </div>
  );
};

export default LineChart;
