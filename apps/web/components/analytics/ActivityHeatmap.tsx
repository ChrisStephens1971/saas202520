/**
 * Activity Heatmap Component
 * D3.js-based heatmap for tournament activity by day/time
 */

'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { scaleLinear } from 'd3-scale';
import { HeatmapCell } from './types';

interface ActivityHeatmapProps {
  data: HeatmapCell[];
  width?: number;
  height?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export function ActivityHeatmap({
  data,
  width = 900,
  height = 300,
}: ActivityHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 60, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(HOURS)
      .range([0, chartWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(DAYS)
      .range([0, chartHeight])
      .padding(0.05);

    // Find max value for color scale
    const maxValue = Math.max(...data.map((d) => d.value));

    // Color scale
    const colorScale = scaleLinear<string>()
      .domain([0, maxValue / 2, maxValue])
      .range(['#f0f0f0', '#fdae61', '#d73027']);

    // Create a map for quick lookup
    const dataMap = new Map(
      data.map((d) => [`${d.row}-${d.col}`, d.value])
    );

    // Add cells
    DAYS.forEach((day, dayIndex) => {
      HOURS.forEach((hour, hourIndex) => {
        const value = dataMap.get(`${dayIndex}-${hourIndex}`) || 0;

        const cell = g
          .append('rect')
          .attr('x', xScale(hour) || 0)
          .attr('y', yScale(day) || 0)
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', value > 0 ? colorScale(value) : '#f9f9f9')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer');

        // Tooltip
        const tooltip = d3
          .select('body')
          .append('div')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', 1000);

        cell
          .on('mouseover', function (event) {
            d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                `<strong>${day}, ${hour}</strong><br/>` +
                  `<strong>Activity:</strong> ${value} tournaments`
              )
              .style('left', event.pageX + 10 + 'px')
              .style('top', event.pageY - 28 + 'px');
          })
          .on('mouseout', function () {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
            tooltip.transition().duration(200).style('opacity', 0);
          });

        // Add text labels for high values
        if (
          value > maxValue * 0.3 &&
          xScale.bandwidth() > 25 &&
          yScale.bandwidth() > 25
        ) {
          g.append('text')
            .attr('x', (xScale(hour) || 0) + xScale.bandwidth() / 2)
            .attr('y', (yScale(day) || 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', value > maxValue * 0.6 ? 'white' : '#333')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .text(value);
        }
      });
    });

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickValues(HOURS.filter((_, i) => i % 3 === 0)))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.15em');

    // Add Y axis
    g.append('g').call(d3.axisLeft(yScale));

    // Add X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('Hour of Day');

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('Day of Week');

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .text('Tournament Activity by Day and Time');

    // Add legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - margin.right - legendWidth;
    const legendY = 30;

    const legendScale = scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat((d) => d.toString());

    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f0f0f0');
    gradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#fdae61');
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#d73027');

    svg
      .append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');

    svg
      .append('g')
      .attr('transform', `translate(${legendX},${legendY + legendHeight})`)
      .call(legendAxis);

    // Cleanup
    return () => {
      d3.selectAll('.tooltip').remove();
    };
  }, [data, width, height]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} className="mx-auto" />
    </div>
  );
}
