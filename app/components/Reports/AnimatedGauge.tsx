import { ResponsivePie } from "@nivo/pie";
import { motion } from "framer-motion";

const ModernGauge = ({ value = 0, max = 100, label = "Health Index" }) => {
  const percentage = Math.min(Math.max(value, 0), max);
  const filled = (percentage / max) * 100;
  const empty = 100 - filled;

  // Get color based on percentage
  const getGaugeColor = (percent: number) => {
    if (percent < 30) return "#ef4444"; // red
    if (percent < 60) return "#f59e0b"; // yellow
    return "#10b981"; // green
  };

  const gaugeColor = getGaugeColor(percentage);

  const data = [
    {
      id: "filled",
      value: filled,
    },
    {
      id: "empty",
      value: empty,
    },
  ];

  // Custom colors array that matches the data order
  const customColors = [gaugeColor, "#e5e7eb"];

  // Needle angle (half-circle: -90° → +90°)
  const angle = -90 + (percentage / max) * 180;

  // Inline styles to ensure they're applied
  const containerStyle = {
    height: "250px",
    width: "300px",
    position: "relative" as const,
    margin: "0 auto",
  };

  const chartContainerStyle = {
    height: "100%",
    width: "100%",
  };

  const needleStyle = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    width: "4px",
    height: "80px",
    backgroundColor: "#374151",
    borderRadius: "2px",
    transformOrigin: "bottom center",
    transform: "translate(-50%, -100%)",
    zIndex: 10,
  };

  const needleBaseStyle = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    width: "16px",
    height: "16px",
    backgroundColor: "#374151",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 11,
  };

  return (
    <div style={containerStyle}>
      <div style={chartContainerStyle}>
        <ResponsivePie
          data={data}
          startAngle={-90}
          endAngle={90}
          innerRadius={0.65}
          cornerRadius={3}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          sortByValue={false}
          colors={customColors}
          borderWidth={0}
          animate={true}
          motionConfig="gentle"
          isInteractive={false}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          layers={[
            "arcs",
            ({ centerX, centerY }) => (
              <g key="gauge-text">
                {/* Value Text */}
                <text
                  x={centerX}
                  y={centerY - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    fill: "#1f2937",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {Math.round(percentage)}
                  {max === 100 ? "%" : ""}
                </text>
                {/* Label Text */}
                <text
                  x={centerX}
                  y={centerY + 25}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: "14px",
                    fill: "#6b7280",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {label}
                </text>
              </g>
            ),
          ]}
        />
      </div>

      {/* Needle */}
      <motion.div
        key="needle"
        initial={{ rotate: -90 }}
        animate={{ rotate: angle }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={needleStyle}
      />

      {/* Needle base circle */}
      <div key="needle-base" style={needleBaseStyle} />
    </div>
  );
};

export default ModernGauge;
