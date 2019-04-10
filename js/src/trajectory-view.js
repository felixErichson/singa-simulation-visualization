const trajectoryPlotMargin = {top: 40, right: 25, bottom: 40, left: 25},
    trajectoryPlotWidth = parseInt(d3.select("#trajectory-view-graph").style("width")) - trajectoryPlotMargin.left - trajectoryPlotMargin.right,
    trajectoryPlotHeight = parseInt(d3.select("#trajectory-view-graph").style("height")) - trajectoryPlotMargin.top - trajectoryPlotMargin.bottom;

let x = d3.scaleLinear().range([0, trajectoryPlotWidth]),
    y0 = d3.scaleLinear().range([trajectoryPlotHeight, 0]),
    y1 = d3.scaleLinear().range([trajectoryPlotHeight, 0]),
    y2 = d3.scaleLinear().range([trajectoryPlotHeight, 0]);

let trajectoryPlot;

let lines = [];
let scales = [];
let axes = [];

const LEFT = 0,
    RIGHT = 1;

function initializePlotSvg() {

    scales = [y0, y1, y2];

    let currentDivWidth = parseInt(d3.select("#trajectory-view-graph").style("width"));
    let currentDivHeight = parseInt(d3.select("#trajectory-view-graph").style("height"));

    trajectoryPlot = d3.select("#trajectory-view-graph")
        .append("svg")
        .attr("width", trajectoryPlotWidth)
        .attr("height", trajectoryPlotHeight + trajectoryPlotMargin.top + trajectoryPlotMargin.bottom)
        .attr("viewBox", "-50 +80 " + (100 + currentDivWidth) + " " + currentDivHeight)
        .attr("preserveAspectRatio", "xMidYMax meet")
        .append('g')
        .attr('transform', `translate(${trajectoryPlotMargin.left}, ${trajectoryPlotMargin.top})`)
}

function initializeAxis() {



}

function setChartTitle(node) {
    trajectoryPlot.append("text")
        .attr("x", (trajectoryPlotWidth / 2))
        .attr("y", -(trajectoryPlotMargin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("text-decoration", "underline")
        .text(node);
}


function createTrajectoryPlot() {

    let trajectoryCounter = 0;
    removeElementsOfSvg();
    initializeLineDataView();
    initializeAxisLabel();
    setPlotXAxis();

    console.log(reducedNodeData);
    activeComponentIdices.forEach(function (indexIdentifier) {
        let data;
        let id;
        let scale;

        let compartment = getCompartmentFromIndexIdentifier(indexIdentifier);
        let species = getSpeciesFromIndexIdentifier(indexIdentifier);
        data = reducedNodeData[compartment + "_" + species];
        id = "#" + indexIdentifier;
        if (trajectoryCounter === 0) {
            //createLine(indexIdentifier);
            scale = y0;
            setPath(data, scale, "y axis left outer", "valueline1", trajectoryCounter, id);
        } else if (trajectoryCounter === 1) {
            scale = y1;
            setPath(data, scale, "y axis right", "", trajectoryCounter, id);
        }
        trajectoryCounter++
    });

    function createLine(indexIdentifier) {
        let compartment = getCompartmentFromIndexIdentifier(indexIdentifier);
        let species = getSpeciesFromIndexIdentifier(indexIdentifier);

        let data = reducedNodeData[compartment + "_" + species];

        let scale = getScale();
        scale.domain([0, d3.max(data, function (d) {
            return d.y;
        })]);

        let line = trajectoryPlot.append('path');
        line.datum(data)
            .attr("id", "line_" + indexIdentifier)
            .style("stroke", getLineColor())
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.x);
                })
                .y(function (d) {
                    scale(d.y);
                }));
        lines.push(line);
    }

    function getLineColor() {
        return color[lines.length];
    }

    function getScale() {
        return scales[lines.length];
    }

    function removeElementsOfSvg() {
        d3.selectAll("#line").remove();
        d3.selectAll(".x.axis").remove();
        d3.selectAll(".y.axis.left").remove();
        d3.selectAll(".y.axis.right").remove();
        d3.selectAll(".label").remove();
        d3.selectAll(".trajectory.view.graph.verticalLine").remove();
    }

    function initializeLineDataView() {

        if (activeComponentIdices[0] !== undefined) {

            trajectoryPlot.append("line")
                .attr("class", "trajectory view graph verticalLine")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", trajectoryPlotHeight)
                .style("stroke-width", 1)
                .style("stroke", "#808080")
                .style("fill", "none");

            appendDataViewLabel("valueLabel", 5);
            appendDataViewCircle("circle", color[0]);

            if (activeComponentIdices[1] !== undefined) {
                appendDataViewLabel("valueLabel2", 15);
                appendDataViewCircle("circle2", color[1]);
            }
        }
    }

    function initializeAxisLabel() {
        //label X-Axis
        trajectoryPlot.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", trajectoryPlotWidth)
            .attr("y", trajectoryPlotHeight + 50)
            .attr("font-size", 20)
            .text("Elapsed time [ms]");

//label Y-Axis
        trajectoryPlot.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", -10)
            .attr("x", 130)
            .attr("font-size", 20)
            .text("Concentration [nmol/l]");
    }

    function alignAxis(position, orientation) {
        let axis;
        if (orientation == LEFT) {
            axis = d3.axisLeft()
        } else {
            axis = d3.axisRight();
        }

        if (position = RIGHT) {
            // move to right
        }
    }

    function setPlotYAxis(axisClassName, color) {

        trajectoryPlot.append("g")
            .attr("class", axisClassName);

        if (axisClassName === "y axis right") {

            callRightYAxis(axisClassName, d3.axisRight(y1), color)

        } else if (axisClassName === "y axis left outer") {

            callLeftYAxis(axisClassName, d3.axisLeft(y0), color)

        } else if (axisClassName === "y axis left inner") {

            callLeftYAxis(axisClassName, d3.axisRight(y2), color)

        }
    }

    function callRightYAxis(axisClassName, call, color) {
        d3.select(".y.axis.right").attr("transform", "translate(" + trajectoryPlotWidth + " ,0)")
            .call(call.tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: color
            })
            .attr("font-size", 17);

    }

    function callLeftYAxis(axisClassName, call, color) {

        d3.select("." + axisClassName.split(" ").join("."))
            .call(call.tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: color
            })
            .attr("font-size", 17);
    }


    function setPlotXAxis() {
        x.domain(d3.extent(time));
        trajectoryPlot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + trajectoryPlotHeight + ")")
            .call(d3.axisBottom(x))
            .attr("font-size", 15);
    }

    function setPath(data, scale, axis, line, iterator, buttonId) {
        scale.domain([0, d3.max(data, function (d) {
            return d.y;
        })]);
        setPlotYAxis(axis, color[iterator]);
        setPlotLine(data, color[iterator], line);
        $(buttonId + ".btn-outline-secondary:not(:disabled):not(.disabled).active").css("background-color", color[iterator], "!important");
    }

    function setPlotLine(data, color, name) {

        trajectoryPlot.append("path")
            .datum(data)
            .attr("id", "line")
            .style("stroke", color)
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.x);
                })
                .y(function (d) {
                    if (name === "valueline1") {
                        return y0(d.y);
                    } else if (name === "valueline3") {
                        return y2(d.y)
                    } else {
                        return y1(d.y)
                    }
                }));
    }

    function appendDataViewLabel(className, dyPosition) {
        trajectoryPlot.append("text")
            .attr("class", "trajectory view graph verticalLine " + className)
            .attr("x", 10)
            .attr("style", "font-size: 15px")
            .attr("dy", dyPosition)
    }

    function appendDataViewCircle(className, strokeColor) {
        trajectoryPlot.append("circle")
            .attr("class", "trajectory view graph verticalLine " + className)
            .attr("r", 7)
            .style("stroke", strokeColor)
            .attr("x", 0)
            .attr("dy", 0)
            .style("fill", "none")
            .style("stroke-width", "1px")
            .style("opacity", "1");
    }


}