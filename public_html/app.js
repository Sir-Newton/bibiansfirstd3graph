import define1 from "./plotLegends.js";

function _key(Legend, chart) {
    return(
            Legend(chart.scales.color, {title: "HR Employee (Details)"})
            )
}

function _chart(StackedBarChart, fullEmpData, d3, columnTitles, width){
    return(
            StackedBarChart(fullEmpData, {
                x: d => d.empName,
                y: d => d.eData,
                z: d => d.detail,
                length: d => +d.length,
                xDomain: d3.groupSort(fullEmpData, D => d3.sum(D, d => +d.eData), d => d.empName),
                xLabel: "Employee Name",
                yLabel: "↑ Employee Details",
                zDomain: columnTitles,
                colors: d3.schemeSpectral[columnTitles.length],
                width,
                height: 550
            })
            )
}

function _employees(FileAttachment) {
    return(
            FileAttachment("HRDataset_v14_Filtered.csv").csv({typed: true})
//            FileAttachment("HRDataset_v14.csv").csv({typed: true})
            )
}

function _columnTitles(fullEmpData) {
    return(
            fullEmpData.columns.slice(1)
            )
}

function _employeedata(columnTitles, fullEmpData) {
    return(
            columnTitles.flatMap(detail => fullEmpData.map(d => ({empName: d.Row_Labels, detail, eData: d[detail]})))
            )
}


function _StackedBarChart(d3) {
    return(
            function StackedBarChart(data, {
            x = (d, i) => i, // given d in data, returns the (ordinal) x-value
                    y = d => d, // given d in data, returns the (quantitative) y-value
                    z = () => 0, // given d in data, returns the (categorical) z-value
                    title, // given d in data, returns the title text
                    marginTop = 30, // top margin, in pixels
                    marginRight = 0, // right margin, in pixels
                    marginBottom = 30, // bottom margin, in pixels
                    marginLeft = 30, // left margin, in pixels
                    width = 640, // outer width, in pixels
                    height = 500, // outer height, in pixels
                    xDomain, // array of x-values
                    xRange = [marginLeft, width - marginRight], // [left, right]
                    xPadding = 0.05, // amount of x-range to reserve to separate bars
                    yType = d3.scaleLinear, // type of y-scale
                    yDomain, // [ymin, ymax]
                    yRange = [height - marginBottom, marginTop], // [bottom, top]
                    zDomain, // array of z-values
                    offset = d3.stackOffsetDiverging, // stack offset method
                    order = d3.stackOrderNone, // stack order method
                    yFormat, // a format specifier string for the y-axis
                    xLabel, // a label for the x-axis
                    yLabel, // a label for the y-axis
                    colors = d3.schemeTableau10, // array of colors
            } = {}) {
                // Compute values.
                const X = d3.map(data, x);
                const Y = d3.map(data, y);
                const Z = d3.map(data, z);

                // Compute default x- and z-domains, and unique them.
                if (xDomain === undefined)
                    xDomain = X;
                if (zDomain === undefined)
                    zDomain = Z;
                xDomain = new d3.InternSet(xDomain);
                zDomain = new d3.InternSet(zDomain);
                // Omit any data not present in the x- and z-domains.
                const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

                // Compute a nested array of series where each series is [[y1, y2], [y1, y2],
                // [y1, y2], …] representing the y-extent of each stacked rect. In addition,
                // each tuple has an i (index) property so that we can refer back to the
                // original data point (data[i]). This code assumes that there is only one
                // data point for a given unique x- and z-value.
                const series = d3.stack()
                        .keys(zDomain)
                        .value(([x, I], z) => Y[I.get(z)])
                        .order(order)
                        .offset(offset)
                        (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
                        .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));

                // Compute the default y-domain. Note: diverging stacks can be negative.
                if (yDomain === undefined)
                    yDomain = d3.extent(series.flat(2));

                // Construct scales, axes, and formats.
                const xScale = d3.scaleBand(xDomain, xRange).paddingInner(xPadding);
                const yScale = yType(yDomain, yRange);
                const color = d3.scaleOrdinal(zDomain, colors);
                const xAxis = d3.axisBottom(xScale).tickSizeOuter(10).ticks(width / 30, yFormat);
                const yAxis = d3.axisLeft(yScale).ticks(height / 30, yFormat);



                // Compute titles.
                if (title === undefined) {
                    const formatValue = yScale.tickFormat(100, yFormat);
                    title = i => `${X[i]}\n${Z[i]}\n${formatValue(Y[i])}`;
                } else {
                    const O = d3.map(data, d => d);
                    const T = title;
                    title = i => T(O[i], i, data);
                }

                const svg = d3.create("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("viewBox", [0, 0, width, height])
                        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

                svg.append("g")
                        .attr("transform", `translate(${marginLeft},0)`)
                        .call(yAxis)
                        .call(g => g.select(".domain").remove())
                        .call(g => g.selectAll(".tick line").clone()
                                    .attr("x2", width - marginLeft - marginRight)
                                    .attr("stroke-opacity", 0.1))
                        .call(g => g.append("text")
                                    .attr("x", -marginLeft)
                                    .attr("y", 10)
                                    .attr("fill", "currentColor")
                                    .attr("text-anchor", "start")
                                    .text(yLabel));

                const bar = svg.append("g")
                        .selectAll("g")
                        .data(series)
                        .join("g")
                        .attr("fill", ([{i}]) => color(Z[i]))
                        .selectAll("rect")
                        .data(d => d)
                        .join("rect")
                        .attr("x", ({i}) => xScale(X[i]))
                        .attr("y", ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
                        .attr("height", ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
                        .attr("width", xScale.bandwidth());
                if (title)
                    bar.append("title")
                            .text(({i}) => title(i));

                svg.append("g")
                        .attr("transform", `translate(0,${yScale(-0.1)})`)
                        .call(xAxis)
                        .call(g => g.append("text")
                                    .attr("x", -marginBottom)
                                    .attr("y", 10)
                                    .attr("fill", "currentColor")
                                    .attr("text-anchor", "end")
                                    .text(xLabel));
                return Object.assign(svg.node(), {scales: {color}});
            }
            )
        }

export default function define(runtime, observer) {
    const main = runtime.module();
    const fileAttachments = new Map([["HRDataset_v14_Filtered.csv", new URL("HRDataset_v14_Filtered.csv", import.meta.url)]]);
            main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
    main.variable(observer("key")).define("key", ["Legend", "chart"], _key);
    main.variable(observer("chart")).define("chart", ["StackedBarChart", "employeedata", "d3", "details", "width"], _chart);
    main.variable().define("employees", ["FileAttachment"], _employees);
    main.variable().define("details", ["employees"], _columnTitles);
    main.variable().define("employeedata", ["details", "employees"], _employeedata);
    main.variable().define("StackedBarChart", ["d3"], _StackedBarChart);
    const child1 = runtime.module(define1);
    main.import("Legend", child1);
    main.import("Swatches", child1);
    return main;
}


