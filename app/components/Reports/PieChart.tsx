import { ResponsivePie } from "@nivo/pie";

interface PieChartProps {
  data: any[];
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  colors?: any
}

const PieChart = ({
  data,
  innerRadius = 0.5,
  padAngle = 1,
  cornerRadius = 3,
  colors = { scheme: "set2" },
}: PieChartProps) => {
  return (
    <div style={{ height: 400 }}>
      <ResponsivePie
        data={data}
        margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
        innerRadius={innerRadius} // 0 for Pie, 0.5 for Donut
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={8}
        colors={colors}
        borderWidth={1}
        borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            justify: false,
            translateY: 56,
            itemWidth: 80,
            itemHeight: 14,
            itemsSpacing: 4,
            symbolSize: 14,
            symbolShape: "circle",
          },
        ]}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
};

export default PieChart;
