const trajectoryPlotMargin = {top: 40, right: 25, bottom: 40, left: 25},
    trajectoryPlotWidth = parseInt(d3.select("#trajectory-view-graph").style("width")) - trajectoryPlotMargin.left - trajectoryPlotMargin.right,
    trajectoryPlotHeight = parseInt(d3.select("#trajectory-view-graph").style("height")) - trajectoryPlotMargin.top - trajectoryPlotMargin.bottom;

const Orientation = {
    East : "east",
    West : "west"
};

const Position = {
    Left : "left",
    Right: "right"
};

const AxisAlignment = {
    LeftEast:{
        orientation : Orientation.East,
        position : Position.Left
    },
    LeftWest:{
        orientation : Orientation.West,
        position : Position.Left
    },
    RightEast:{
        orientation : Orientation.East,
        position : Position.Right
    },
    RightWest:{
        orientation : Orientation.West,
        position : Position.Right
    }
};

let x = d3.scaleLinear().range([0, trajectoryPlotWidth]);

let trajectoryPlot;

let lines = [];
let scales = [];
let alignments = [];


function initializePlotSvg() {

    for (let scaleCounter = 0; scaleCounter < 4; scaleCounter++) {
        scales.push(d3.scaleLinear().range([trajectoryPlotHeight, 0]))
    }

    alignments = [AxisAlignment.LeftEast, AxisAlignment.RightWest, AxisAlignment.LeftWest, AxisAlignment.RightEast];

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

    // let trajectoryCounter = 0;
    removeElementsOfSvg();
    initializeAxisLabel();
    setPlotXAxis();
    lines.length = 0;

    activeComponentIdices.forEach(function (indexIdentifier) {
            createAxis(indexIdentifier);
            createLine(indexIdentifier);


    });
    initializeLineDataView();
    function getPlotData(indexIdentifier) {

        let compartment = getCompartmentFromIndexIdentifier(indexIdentifier);
        let species = getSpeciesFromIndexIdentifier(indexIdentifier);

        return reducedNodeData[compartment + "_" + species];

    }

    function getDomain(data) {

       let scale = getScale();

       return scale.domain([0, d3.max(data, function (d) {
            return d.y;
        })]);
    }

    function createLine(indexIdentifier) {
        let data = getPlotData(indexIdentifier);
        let scale = getDomain(data);

        let line = trajectoryPlot.append('path');
        line.datum(data)
            .attr("class", "line")
            .attr("id", "line_" + indexIdentifier)
            .style("stroke", getLineColor())
            .attr("d", d3.line()
                .x(function (d) {
                    return x(d.x);
                })
                .y(function (d) {
                    return scale(d.y);
                }));
        $("#" + indexIdentifier + ".btn-outline-secondary:not(:disabled):not(.disabled).active")
            .css("background-color", getLineColor(), "!important");
        lines.push(line);
    }

    function getLineColor() {
        return color[lines.length];
    }

    function getScale() {
        return scales[lines.length];
    }

    function removeElementsOfSvg() {
        d3.selectAll(".line").remove();
        d3.selectAll(".x.axis").remove();
        d3.selectAll(".y.axis").remove();
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

            appendDataViewLabel("valueLabel one", 5);
            appendDataViewCircle("circle", color[0]);

            if (activeComponentIdices[1] !== undefined) {
                appendDataViewLabel("valueLabel two", 15);
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

    function createAxis(indexIdentifier) {

        let data = getPlotData(indexIdentifier);
        let scale = getDomain(data);

        let axis;
        let axisClassName = "y axis";
        let alignment = alignments[lines.length];

        let axisNode = trajectoryPlot.append("g");

        if (alignment.position  === Position.Right) {
            axisNode.attr("transform", "translate(" + trajectoryPlotWidth + " ,0)")
        }
        axisClassName += " " + alignment.position;

        if (alignment.orientation === Orientation.East) {
            axis = d3.axisLeft(getScale());
        } else {
            axis = d3.axisRight(getScale());
        }
        axisClassName += " " + alignment.orientation;

        axisNode.attr("class", axisClassName)
            .call(axis.tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: getLineColor()
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