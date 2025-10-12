import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Minus,
  Ticket,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React from "react";
import type { TicketStats } from "../lib/types";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, icon: Icon, color, trend }: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground mb-3">
            {value.toLocaleString()}
          </p>
          {trend && (
            <div className="flex items-center">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : trend.value === 0 ? (
                <Minus className="w-4 h-4 text-muted-foreground mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-semibold ${
                  trend.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : trend.value === 0
                      ? "text-muted-foreground"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                vs last month
              </span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-lg`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  stats: TicketStats;
  trends?: {
    total?: { value: number; isPositive: boolean };
    open?: { value: number; isPositive: boolean };
    in_progress?: { value: number; isPositive: boolean };
    resolved?: { value: number; isPositive: boolean };
    reopened?: { value: number; isPositive: boolean };
    closed?: { value: number; isPositive: boolean };
  };
}

export default function DashboardStats({ stats, trends }: DashboardStatsProps) {
  const statsData = [
    {
      title: "Total Tickets",
      value: stats.total,
      icon: Ticket,
      color: "bg-gradient-to-br from-primary to-primary/80",
      trend: trends?.total,
    },
    {
      title: "Open Tickets",
      value: stats.open,
      icon: AlertTriangle,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      trend: trends?.open,
    },
    {
      title: "In Progress",
      value: stats.in_progress,
      icon: Clock,
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600",
      trend: trends?.in_progress,
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle2,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      trend: trends?.resolved,
    },
    {
      title: "Reopened",
      value: stats.reopened,
      icon: AlertTriangle,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      trend: trends?.reopened,
    },
    {
      title: "Closed",
      value: stats.closed,
      icon: CheckCircle2,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      trend: trends?.closed,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
        />
      ))}
    </div>
  );
}
