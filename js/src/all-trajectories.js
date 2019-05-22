
const allTrajectoriesPlotMargin = {top: 40, right: 20, bottom: 40, left: 100},
      allTrajectoriesPlotWidth = 400 - allTrajectoriesPlotMargin.left - allTrajectoriesPlotMargin.right,
      allTrajectoriesPlotHeight = 300 - allTrajectoriesPlotMargin.top - allTrajectoriesPlotMargin.bottom;

function createAllTrajectoriesMenu() {

    let allTrajectoriesContext;
    createAllPlots();

    function createAllPlots() {
        compartmentsOfSelectedNode.forEach(function (compartment) {
            d3.select("#menu-all-trajectories")
                .append("div")
                .attr("id", "trajectories-compartment-" + compartmentsOfSelectedNode.indexOf(compartment))
                .append("h2")
                .text(compartment);
        });

        for (let identifier in reducedNodeData) {
            let compartment = getCompartmentFromStringIdentifier(identifier);
            let species = getSpeciesFromStringIdentifier(identifier);
            let selector = "#trajectories-compartment-" + compartmentsOfSelectedNode.indexOf(compartment);

            prepareSinglePlot(selector, species, identifier);
        }
    }

    function prepareSinglePlot(selector, title, identifier) {

        allTrajectoriesContext = d3.select(selector)
            .append("svg")
            .attr("float", "left")
            .attr("width", allTrajectoriesPlotWidth + allTrajectoriesPlotMargin.left + allTrajectoriesPlotMargin.right)
            .attr("height", allTrajectoriesPlotHeight + allTrajectoriesPlotMargin.top + allTrajectoriesPlotMargin.bottom)
            .append("g")
            .attr("transform","translate(" + allTrajectoriesPlotMargin.left + "," + allTrajectoriesPlotMargin.top + ")");

        initializeAxisLabel();
        initializeTitle(title);
        addPlotData(identifier);


    }

    function initializeTitle(title) {
        allTrajectoriesContext.append("text")
            .attr("x", (allTrajectoriesPlotWidth / 2))
            .attr("y", 0 - (allTrajectoriesPlotMargin.top / 1.5))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text(title);
    }

    function initializeAxisLabel() {
        allTrajectoriesContext.append("text")
            .attr("x", (allTrajectoriesPlotWidth / 2) + 20)
            .attr("y", allTrajectoriesPlotHeight + 30)
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("font-size", "15px")
            .text("[ms]");

        allTrajectoriesContext.append("text")
            .attr("y", -10)
            .attr("x", 30)
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("font-size", "15px")
            .text("[nmol/l]");
    }

    function addPlotData(identifier) {

        let xAxisScale = d3.scaleLinear()
            .domain(d3.extent(reducedNodeData[identifier], function (d) {
                return d.x;
            }))
            .range([0, allTrajectoriesPlotWidth]);

        let yAxisScale = d3.scaleLinear()
            .domain([0, d3.max(reducedNodeData[identifier], function (d) {
                return d.y;
            })])
            .range([allTrajectoriesPlotHeight, 0]);


        allTrajectoriesContext.append("g")
            .attr("transform", "translate(0," + allTrajectoriesPlotHeight + ")")
            .call(d3.axisBottom(xAxisScale).ticks(4));

        allTrajectoriesContext.append("g")
            .call(d3.axisLeft(yAxisScale).ticks(5));

        allTrajectoriesContext.append("path")
            .datum(reducedNodeData[identifier])
            .style("stroke", getRandomColor())
            .style("fill", "none")
            .attr("d", d3.line()
                .x(function (d) {
                    return xAxisScale(d.x);
                })
                .y(function (d) {
                    return yAxisScale(d.y);
                }));
    }

}