/**
 * Cohort Retention Heatmap Component
 * D3.js-based heatmap for visualizing cohort retention over time
 */

'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { scaleLinear } from 'd3-scale';
import { CohortData } from './types';

interface CohortHeatmapProps {
  data: CohortData[];
  width?: number;
  height?: number;
}

export function CohortHeatmap({ data, width = 800, height = 400 }: CohortHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 60, right: 20, bottom: 40, left: 120 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Find max number of months
    const maxMonths = Math.max(...data.map((d) => d.retentionByMonth.length));

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(Array.from({ length: maxMonths }, (_, i) => `Month ${i}`))
      .range([0, chartWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.cohortMonth))
      .range([0, chartHeight])
      .padding(0.05);

    // Color scale (0-100%)
    const colorScale = scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#f7fbff', '#6baed6', '#08519c']);

    // Add cells
    data.forEach((cohort, _cohortIndex) => {
      cohort.retentionByMonth.forEach((retention, monthIndex) => {
        const cell = g
          .append('rect')
          .attr('x', xScale(`Month ${monthIndex}`) || 0)
          .attr('y', yScale(cohort.cohortMonth) || 0)
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', colorScale(retention))
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
                `<strong>Cohort:</strong> ${cohort.cohortMonth}<br/>` +
                  `<strong>Month ${monthIndex}:</strong> ${retention.toFixed(1)}%<br/>` +
                  `<strong>Cohort Size:</strong> ${cohort.cohortSize} users`
              )
              .style('left', event.pageX + 10 + 'px')
              .style('top', event.pageY - 28 + 'px');
          })
          .on('mouseout', function () {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
            tooltip.transition().duration(200).style('opacity', 0);
          });

        // Add text labels for values
        if (xScale.bandwidth() > 40 && yScale.bandwidth() > 30) {
          g.append('text')
            .attr('x', (xScale(`Month ${monthIndex}`) || 0) + xScale.bandwidth() / 2)
            .attr('y', (yScale(cohort.cohortMonth) || 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', retention > 50 ? 'white' : '#333')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .text(`${retention.toFixed(0)}%`);
        }
      });
    });

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
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
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('Months Since Sign Up');

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('Cohort Month');

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .text('Cohort Retention Analysis');

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
