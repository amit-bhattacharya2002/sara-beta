"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface BarGraphProps {
  data: Array<{ name: string; value: number }>
  color?: string
  compact?: boolean
}

export function BarGraph({ data, color = "hsl(var(--chart-1))", compact = false }: BarGraphProps) {
  // Debug: Log the data being passed to BarGraph
  console.log("🔍 BarGraph received data:", data);
  
  const isValidData =
    Array.isArray(data) &&
    data.length > 0 &&
    data.every((d) => d && typeof d.name === "string" && typeof d.value === "number")

  console.log("🔍 BarGraph isValidData:", isValidData);

  if (!isValidData) {
    console.log("❌ BarGraph: Invalid data, showing fallback message");
    return <div className="text-sm text-muted-foreground">No bar chart data</div>
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart container that fills available space */}
      <div className="flex-1 min-h-0">
        <ChartContainer
          config={{
            value: {
              label: "Value",
              color: color,
            },
          }}
          className="w-full h-full text-foreground"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 2,
                right: 2,
                left: 40,
                bottom: 15,
              }}
            >
              <XAxis
                dataKey="name"
                interval={0}
                height={40}
                tick={({ x, y, payload }) => {
                  const label = String(payload?.value ?? "")
                  const words = label.split(" ")
                  return (
                    <text
                      x={x}
                      y={y + 3}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize={9}
                    >
                      {words.map((word, index) => (
                        <tspan key={index} x={x} dy={index === 0 ? 0 : 8}>
                          {word}
                        </tspan>
                      ))}
                    </text>
                  )
                }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={compact ? 2 : 5}
                fontSize={compact ? 9 : 10}
                tickFormatter={(value) => value.toLocaleString()}
                stroke="currentColor"
                tick={{ fill: "currentColor" }}
                width={compact ? 20 : 25}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                maxBarSize={compact ? 30 : 40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
