import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import {
  MODEL_POOL,
  getHeadModels,
  getBoardModels,
  getManagerModels,
  type ModelEntry,
} from "../core/models.js";

export function ModelView({ width, height }: { width: number; height: number }): JSX.Element {
  const [filter, setFilter] = useState<string>("all");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filters = ["all", "head", "board", "manager"];

  const filtered =
    filter === "all"
      ? MODEL_POOL
      : MODEL_POOL.filter((m) => m.tier === filter);

  const visible = filtered.slice(0, Math.max(1, height - 4));

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (key.leftArrow) {
      const fi = filters.indexOf(filter);
      setFilter(filters[Math.max(0, fi - 1)]);
      setSelectedIdx(0);
    } else if (key.rightArrow) {
      const fi = filters.indexOf(filter);
      setFilter(filters[Math.min(filters.length - 1, fi + 1)]);
      setSelectedIdx(0);
    }
  });

  const tierBadge = (tier: string) => {
    switch (tier) {
      case "head": return { text: "HEAD", color: "magentaBright" as const };
      case "board": return { text: "BOARD", color: "yellowBright" as const };
      case "manager": return { text: "MGR", color: "greenBright" as const };
      default: return { text: tier.toUpperCase(), color: "white" as const };
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box marginBottom={1} flexDirection="row">
        <Text bold color="cyanBright">
          Model Pool
        </Text>
        <Text color="gray"> — {MODEL_POOL.length} models</Text>
      </Box>

      {/* Filter tabs */}
      <Box flexDirection="row" marginBottom={1}>
        {filters.map((f) => (
          <Box key={f} marginRight={2}>
            <Text
              bold={f === filter}
              color={f === filter ? "cyanBright" : "gray"}
              backgroundColor={f === filter ? "cyan" : undefined}
            >
              {f === filter ? ` ${f.toUpperCase()} ` : ` ${f.toUpperCase()} `}
            </Text>
          </Box>
        ))}
        <Text color="gray" dimColor> ← → to filter</Text>
      </Box>

      {/* Model list */}
      <Box flexDirection="column">
        {visible.map((model, idx) => {
          const badge = tierBadge(model.tier);
          const isSelected = idx === selectedIdx;
          return (
            <Box
              key={model.id}
              flexDirection="row"
              height={1}
            >
              <Text color={badge.color} bold>
                [{badge.text}]
              </Text>
              <Text color={isSelected ? "white" : "gray"}>
                {" "}{model.name.slice(0, 28).padEnd(30)}{" "}
              </Text>
              <Text color="gray" dimColor>
                {model.org.padEnd(12)}{" "}
              </Text>
              <Text color="gray" dimColor>
                {(model.contextWindow / 1000).toFixed(0)}k ctx
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
