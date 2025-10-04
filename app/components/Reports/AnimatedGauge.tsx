// components/charts/ModernGauge.js
import { ResponsivePie } from "@nivo/pie";
import { motion } from "framer-motion";

const ModernGauge = ({ value = 0, max = 100, label = "Health Index" }) => {
  const percentage = Math.min(Math.max(value, 0), max);
  const filled = (percentage / max) * 100;
  const empty = 100 - filled;

  const data = [
    { id: "value", value: filled, color: "url(#gaugeGradient)" },
    { id: "rest", value: empty, color: "#f0f0f0" },
  ];

  // Needle angle (half-circle: -90° → +90°)
  const angle = -90 + (percentage / max) * 180;

  return (
    <div style={{ height: 200, position: "relative" }}>
      <ResponsivePie
        data={data}
        startAngle={-90}
        endAngle={90}
        innerRadius={0.65}
        cornerRadius={6}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        sortByValue={false}
        colors={{ datum: "data.color" }}
        animate={true}
        motionConfig="gentle"
        defs={[ 
          {
            id: "gaugeGradient",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "rgb(242, 107, 105)" },   // soft red
              { offset: 50, color: "rgb(235, 196, 98)" }, // soft yellow
              { offset: 100, color: "rgb(97, 197, 102)" }, // soft green
            ],
          },
        ]}
        fill={[{ match: { id: "value" }, id: "gaugeGradient" }]}
        layers={[
          "arcs",
          ({ centerX, centerY }) => (
            <>
              {/* Value */}
              <text
                x={centerX}
                y={centerY + 0}
                textAnchor="middle"
                style={{ fontSize: "22px", fontWeight: "bold", fill: "#333" }}
              >
                {Math.round(filled)}%
              </text>
              {/* Label */}
              <text
                x={centerX}
                y={centerY + 40}
                textAnchor="middle"
                style={{ fontSize: "14px", fill: "#777" }}
              >
                {label}
              </text>
            </>
          ),
        ]}
      />

      {/* Needle */}
      <motion.div
        initial={{ rotate: -90 }}
        animate={{ rotate: angle }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "4px",
          height: "70px",
          background: "linear-gradient(to bottom, #333, #111)",
          borderRadius: "2px",
          transformOrigin: "bottom center",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
        }}
      />

      {/* Needle base circle */}
      <motion.div
        transition={{ type: "spring", stiffness: 200 }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "22px",
          height: "22px",
          background: "radial-gradient(circle, #555 30%, #111 90%)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 6px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
};

export default ModernGauge;
