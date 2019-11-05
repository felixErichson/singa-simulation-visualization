//TODO CSV einlesen ohne heatmap

const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;

let currentcolor;

let simulationScale;

let infoTooltip = d3.select("body").append("div")
    .attr("class", "infoTooltip")
    .style("opacity", 0);

let currentTimeIndex,
    dragedTimeLabel,
    concentrationRange,
    svgSlider,
    moving = false,
    timer,
    legendSvg,
    LegendAxisScale,
    globalSpecies,
    currentTimeStep = 0,
    counter = 0,
    interpolator = d3.interpolateViridis,
    observed = ["", ""];


function setHeatmapDropdown(container, text, csv) {

    d3.selectAll(".mx-auto").remove();
    d3.selectAll(".dropdown-menu").remove();
    d3.selectAll(".dropdown-item").remove();
    d3.select(".loader").remove();

    d3.select(container)
        .append("div")
        .attr("class", "mx-auto btn-group")
        .attr("id", "heatmap_dropdown")
        .style("margin-top", "10px")
        .style("position", "relative")

        .append("button")
        .attr("type", "button")
        .attr("class", "mx-auto btn btn-primary dropdown-toogle")
        .attr("id", "dropdown_button")
        .attr("data-toggle", "dropdown")
        .attr("aria-haspopup", "true")
        .attr("aria-expanded", "false")
        .text(text);

    d3.select("#heatmap_dropdown")
        .append("div")
        .attr("class", "dropdown-menu")
        .attr("id", "heat_menu");

    for (let speciesIndex in speciesIdentifiers) {
        d3.select("#heat_menu")
            .append("a")
            .attr("class", "dropdown-item")
            .attr("id", speciesIndex)
            .text(speciesIdentifiers[speciesIndex])
            .on("click", function () {
                globalSpecies = $(this).text();
                onClickHeatmapDropdown(csv);
            })
    }
}

function initialSpatialView() {

    $('#nav-option').css('visibility', 'visible');
    $('#nav-figure').css('visibility', 'visible');

    d3.selectAll('#trajectory-view-heatmap svg').remove();
    d3.selectAll('.heatmapHeading').remove();
    d3.select("#play-button").remove();
    d3.select("#forward").remove();
    d3.select("#backward").remove();
    d3.selectAll('#heatmap-view-slider svg').remove();

}

function appendSpatialViewHeadLine() {

    d3.select('#trajectory-view-heatmap')
        .append("i")
        .style("font-size", "xx-large")
        .attr("class", "heatmapHeading fas fa-th")
        .on("mouseover", function () {
            generateTooltip('The heatmap represents a part of a cell. <br>' +
                ' The color gradient shows the change in concentration of individual species. <br> ' +
                '<b>Clicking</b> on the contents allows to see the concentration changes in a line plot.<br>');
            showTooltip();
        })
        .on("mouseleave", function () {
            hideTooltip();
        });

    d3.select('#trajectory-view-heatmap')
        .append("h2")
        .attr("class", "heatmapHeading")
        .style("display", "inline-block")
        .style("margin-left", "4px").text("SPATIAL VIEW");
}

/**
 * Creates the Concentration plot when a CSV File is loaded, otherwise the spatial view is created-
 * @param csv String "csv" when loading a CSV file
 */

function onClickHeatmapDropdown(csv) {

    initialSpatialView();

    if (csv === "csv") {

        // inital view for csv
        selectedNode = "n(0,0)";
        drawConcentrationPlotFromNode();
        setHeatmapDropdown("#trajectory-view-heatmap", "csv");
        onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(globalSpecies)[0], globalSpecies), globalSpecies);
    } else {
        // initial view for json
        appendSpatialViewHeadLine();
        setHeatMapSvg();
        appendPlayButton();
        drawSilder();
        clearHtmlTags();
        drawHeatmapLegend();

        //creates a hint
        d3.select("#trajectory-view-graph")
            .append("div")
            .attr("id", "trajectory-view-hint")
            .append("p")
            .text("To show the changes in concentration in a line chart, click any element in the heatmap.");

        $('#heatmap_dropdown').appendTo("#trajectory-view-heatmap");
        $('#dropdown_button').text(globalSpecies);
    }
}

function appendPlayButton() {

    d3.select("#heatmap-view-slider")
        .append("div")
        .attr("id", "play-button")
        .attr("class", "playbutton")
        .append("i")
        .attr("class", "far fa-play-circle fa-2x")
        .style("color", "#0cac79");

    playButton = d3.select("#play-button")
}

function drawSilder() {

    let slideControl,
        sliderTimeScale;

    currentTimeIndex = 0;

    appendBackwardIcon();
    appendForwardIcon();

    initializeSlider();

    let slider =
        svgSlider
            .append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + marginSlider.left + "," + heightSlider / 3 + ")");

    drawTrack(slider);
    drawTrackOverlay(slider);
    setClickFunctionPlayButton();

    function initializeSlider() {

        concentrationRange = getRangeOfSpecies();

        currentTimeStep = timeSteps[0];
        svgSlider = d3.select("#heatmap-view-slider")
            .append("svg")
            .attr("style", "margin-left: 50px")
            .attr("width", widthSlider + marginSlider.left + marginSlider.right)
            .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

        getHeatmapData();
        heatmapColor = setHeatmapColor();
        drawSpatialView();

        sliderTimeScale = d3.scaleLinear()
            .domain([0, timeSteps.length - 1])
            .range([0, widthSlider])
            .clamp(true);

    }

    function drawTrack(slider) {
        slider.append("line")
            .attr("class", "track")
            .attr("x1", sliderTimeScale.range()[0])
            .attr("x2", sliderTimeScale.range()[1])
            .select(function () {
                return this.parentNode.appendChild(this.cloneNode(true));
            })
            .attr("class", "track-inset")
            .select(function () {
                return this.parentNode.appendChild(this.cloneNode(true));
            })
            .attr("class", "track-overlay")
            .call(d3.drag()
                .on("start.interrupt", function () {
                    slider.interrupt();

                })
                .on("start drag", function () {
                    currentTimeIndex = Math.trunc(sliderTimeScale.invert(d3.event.x));
                    moveSliderControl();
                    updateSpatialView();

                })
            );
    }

    function moveSliderControl() {
        slideControl.attr("cx", sliderTimeScale(currentTimeIndex));
        dragedTimeLabel.text(d3.format(".3f")(currentTimeStep) + " ms");
    }

    function drawTrackOverlay(slider) {

        slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(0," + 10 + ")")
            .selectAll("text")
            .data(sliderTimeScale.ticks(8))
            .enter()
            .append("text")
            .attr("x", sliderTimeScale)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .text(function (d) {
                return d3.format(".0f")(timeSteps[d])
            });

        slideControl = slider.insert("circle", ".track-overlay")
            .attr("class", "slideControl")
            .attr("r", 7);


        dragedTimeLabel = slider.append("text")
            .attr("class", "timeLabelSlider")
            .attr("text-anchor", "middle")
            .text(timeSteps[0] + " ms")
            .attr("transform", "translate(450," + (-30) + ")");
    }

    function appendBackwardIcon() {
        d3.select("#heatmap-view-slider")
            .append("div")
            .attr("id", "backward")
            .style("margin-left", "273px")
            .style("position", "absolute").on("click", function () {

            if (currentTimeIndex > 0) {
                currentTimeIndex--;
                moveSliderControl();
                updateSpatialView();
            }
        })
            .append("i")
            .attr("class", "fas fa-step-backward fa-lg")
            .style("color", "#0cac79");
    }

    function appendForwardIcon() {
        d3.select("#heatmap-view-slider")
            .append("div")
            .attr("id", "forward")
            .style("margin-left", "394px")
            .style("position", "absolute")
            .on("click", function () {
                if (currentTimeIndex < timeSteps.length) {
                    currentTimeIndex++;
                    moveSliderControl();
                    updateSpatialView();
                }
            })
            .append("i")
            .attr("class", "fas fa-step-forward fa-lg")
            .style("color", "#0cac79");
    }

    function setClickFunctionPlayButton() {
        playButton
            .on("click", function () {
                let button = d3.select(this);
                if (button.select("i").attr("class") === "far fa-pause-circle fa-2x") {
                    moving = false;
                    clearInterval(timer);
                    // timer = 0;
                    button.select("i").attr("class", "far fa-play-circle fa-2x");
                } else {
                    moving = true;
                    timer = setInterval(function () {
                        moveSliderControl();
                        step();
                    }, 100);
                    button.select("i").attr("class", "far fa-pause-circle fa-2x");
                }
            });
    }
}

function step() {
    updateSpatialView();
    currentTimeIndex = currentTimeIndex + 5;
    if (currentTimeIndex > timeSteps.length - 1) {
        moving = false;
        currentTimeIndex = 0;
        clearInterval(timer);
        playButton.select("i").attr("class", "far fa-play-circle fa-2x");
    }
}

/**
 * Renews the data, legend and color scaling of the heatmap and refreshes it.
 * @param figure
 */
function updateSpatialView(figure) {

    currentTimeStep = timeSteps[currentTimeIndex];

    getHeatmapData();
    heatmapColor = setHeatmapColor();
    drawSpatialView(figure);
    relativeScaleAxis();
    absoluteScaleAxis();
    drawHeatmapLegend();
}

function drawHeatmapLegend() {

    d3.select("#heatLEngend").html('');

    d3.select("#legend-traffic").remove();
    d3.select(".legendWrapper").remove();
    d3.select(".legendRect").remove();
    d3.select(".axislegend").remove();

    let legendsvg = legendSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    const legendColorScale = d3.scaleSequential()
        .domain([0, heatwidth]).interpolator(interpolator);

    legendsvg.selectAll(".bars")
        .data(d3.range(heatwidth), function (d) {
            return d;
        })
        .enter().append("rect")
        .attr("class", "bars")
        .attr("x", function (d, i) {
            return i + 15;
        })
        .attr("y", 0)
        .attr("height", 10)
        .attr("width", 1)
        .style("fill", function (d, i) {
            return legendColorScale(d)
        });

    legendsvg.append("text")
        .attr("class", "heatmap legend label")
        .attr("text-anchor", "end")
        .attr("x", 450)
        .attr("y", 25)
        .attr("font-size", 12)
        .text(concentrationUnit);

    if ($('input[name="scalecheck"]:checked').val() === "relative") {
        relativeScaleAxis();
    } else {
        absoluteScaleAxis();
    }

    let xAxis = d3.axisBottom()
        .ticks(5)
        .scale(LegendAxisScale);

    legendsvg.append("g")
        .attr("class", "axislegend")
        .attr("transform", "translate(210,10)")
        .call(xAxis);
}

function relativeScaleAxis() {

    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(d3.extent(getCurrentConcentrations(), function (d) {
            return d
        }));
}

function absoluteScaleAxis() {
    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(concentrationRange);
}


let concentrationData = d3.map();
let pathData = [];

function setCirclePath(cx, cy, r) {
    return `M ${cx} ${cy} m ${-r}, 0 a ${r},${r} 0 1,1 ${(r * 2)},0 a ${r},${r} 0 1,1 ${-(r * 2)},0`;
}

function getHeatmapData() {

    pathData.length = 0;

    let i = 0;
    let simulationExtend = simulationWidth < simulationHeight ? simulationHeight : simulationWidth;
    simulationScale = d3.scaleLinear().domain([0, simulationExtend]).range([0, 450]);

    nestedData.get(currentTimeStep).entries().forEach(function (updatable) {

            let updatableConcentrationMap = d3.map();
            concentrationData.set(updatable.key, updatableConcentrationMap);

            // iterate updatables
            updatable.value.entries().forEach(function (compartment) {

                    // create concentration map
                    let concentrationtMap = undefined;
                    compartment.value.entries().forEach(function (value) {
                        if (value.key === globalSpecies) {
                            concentrationtMap = value.value;
                        }
                        updatableConcentrationMap.set(compartment.key, concentrationtMap);

                        // console.log(updatable.key, compartment.key);

                        if (isNode(updatable)) {
                            if (value.key === "positions") {
                                if (compartment.key.includes("membrane")) {
                                    pathData.push({
                                        "path": positionsToPath(value.value),
                                        "class": "spatialView lowerMembraneLine",
                                        "referenceNode": updatable.key,
                                        "referenceCompartment": compartment.key,
                                        "toColor": "stroke",
                                        "sortNumber": "2"
                                    });
                                    i++;
                                    pathData.push({
                                        "path": positionsToPath(value.value),
                                        "class": "spatialView upperMembraneLine",
                                        "referenceNode": updatable.key,
                                        "referenceCompartment": compartment.key,
                                        "toColor": "stroke",
                                        "sortNumber": "3"
                                    });
                                } else {
                                    pathData.push({
                                        "path": positionsToPath(value.value) + "Z",
                                        "class": "spatialView closedCompartment",
                                        "referenceNode": updatable.key,
                                        "referenceCompartment": compartment.key,
                                        "toColor": "fill",
                                        "sortNumber": "1"
                                    });
                                }
                            }
                        }
                    });
                    // set vesicle positions
                    if (isVesicle(updatable)) {
                        let centerX = updatable.value.get("vesicle lumen").get("positions")[0].x;
                        let centerY = updatable.value.get("vesicle lumen").get("positions")[0].y;
                        let borderY = updatable.value.get("vesicle membrane").get("positions")[0].y;

                        if (compartment.key.includes("membrane")) {
                            pathData.push({
                                "path": setCirclePath(simulationScale(centerX), simulationScale(centerY), 2 * simulationScale((borderY - centerY))),
                                "class": "spatialView vesicleMembrane",
                                "referenceNode": updatable.key,
                                "referenceCompartment": compartment.key,
                                "toColor": "fill",
                                "sortNumber": "4" + updatable.key.split("v")[1] + "1"
                            });
                        } else {
                            pathData.push({
                                "path": setCirclePath(simulationScale(centerX), simulationScale(centerY), simulationScale(borderY - centerY)),
                                "class": "spatialView vesicleCore",
                                "referenceNode": updatable.key,
                                "referenceCompartment": compartment.key,
                                "toColor": "fill",
                                "sortNumber": "4" + updatable.key.split("v")[1] + "2"
                            });
                        }
                    }

                    // console.log(observed[0], " ", updatable.key)
                    // console.log(observed[1], " ", compartment.key)
                    if (updatable.key === observed[0] && compartment.key === observed[1]) {
                        // console.log("!!!!", pathData[pathData.length - 1].class);
                        pathData[pathData.length - 1].class = pathData[pathData.length - 1].class.concat(" observed");
                    }

                    i++
                }
            );
            i++
        }
    );

    pathData.sort(function (a, b) {
        return a.sortNumber - b.sortNumber;
    });
}

/**
 * Returns minimum and maximum concentrations of a species over the entire simulation period.
 * @return Array [minimum , maximum] concentration
 */
function getRangeOfSpecies() {
    let maxValue = 0.0;
    let minValue = Number.MAX_VALUE;

    let compartments = getCompartmentFromSpecies(globalSpecies);

    compartments.forEach(function (compartment) {
        nestedData.values().forEach(function (node) {
            node.values().forEach(function (currentSpecies) {
                if (currentSpecies.get(compartment) !== undefined) {
                    if (maxValue < currentSpecies.get(compartment).get(globalSpecies))
                        maxValue = currentSpecies.get(compartment).get(globalSpecies);
                    if (minValue > currentSpecies.get(compartment).get(globalSpecies)) {
                        minValue = currentSpecies.get(compartment).get(globalSpecies);
                    }
                }
            })
        })
    });

    if (minValue === Number.MAX_VALUE) {
        return [0, 0]
    }
    return [minValue, maxValue];
}

function isNode(nodeEntry) {
    return nodeEntry.key.startsWith("n");
}

function isVesicle(nodeEntry) {
    return nodeEntry.key.startsWith("v");
}

/**
 * Returns all concentrations of a species for one timeSteps step
 * @return Array of concentrations
 */
function getCurrentConcentrations() {

    let concentrations = [];
    concentrationData.entries().forEach(function (nodeEntry) {
        nodeEntry.value.entries().forEach(function (compartmentEntry) {
            if (compartmentEntry.value !== undefined) {
                concentrations.push(compartmentEntry.value)
            }
        })
    });
    return concentrations;
}

function setHeatmapColor() {

    if ($('input[name="scalecheck"]:checked').val() === "relative") {
        let concentrations = getCurrentConcentrations();
        return d3.scaleSequential()
            .domain([d3.min(concentrations, function (d) {
                return d
            }), d3.max(concentrations, function (d) {
                return d
            })])
            .interpolator(interpolator);

    } else if ($('input[name="scalecheck"]:checked').val() === "absolute") {
        return d3.scaleSequential()
            .domain([concentrationRange[0], concentrationRange[1]])
            .interpolator(interpolator);
    }
}

function setHeatMapSvg() {

    let zoom = d3.zoom()
        .scaleExtent([1, 7])
        .translateExtent([[-100, -100], [heatwidth + 90, heatheight + 100]])
        .on("zoom", zoomSpatialView);

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", 450)
        .attr("height", 500)
        .attr("id", "heatmapSvg")

        .style("border", "1px solid black")
        .append("g")
        .attr("transform",
            "translate(0,0)")
        .attr("class", "PiYG")
        .call(zoom);

    legendSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", 450)
        .attr("height", 50)
        .attr("id", "heatmapLegend")
        .attr("class", "heatLegend");


}

function zoomSpatialView() {
    heatmapSvg.attr("transform", d3.event.transform);
}

/**
 * Coverts positions into a SVG path
 * @param positions
 * @return SVG Path
 */
function positionsToPath(positions) {

    let path = "M";
    positions.forEach(function (position, i) {
        path += simulationScale(position.x) + "," + simulationScale(position.y);
        if (i !== positions.length - 1) {
            path += ","
        }
    });
    return path;
}

/**
 * Draws the spatial view into the SVG area. It distinguishes between nodes, membranes and vesicles.
 * @param figure
 */
function drawSpatialView(figure) {

    d3.selectAll(".spatialView").remove();

    pathData.forEach(function (element) {

        let concentration = concentrationData.get(element.referenceNode).get(element.referenceCompartment);

        heatmapSvg.append("path")
            .attr("class", element.class)
            .attr("d", element.path)
            .style(element.toColor, function () {
                if (concentration !== undefined) {
                    return heatmapColor(concentration)
                } else {
                    return "#fff"
                }
            })
            .on("click", function () {
                d3.select("#trajectory-view-hint").remove();
                selectedNode = element.referenceNode;
                drawConcentrationPlotFromNode();
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(globalSpecies)[0], globalSpecies), globalSpecies);
                setChartTitle(selectedNode);
                setObserved(selectedNode, element.referenceCompartment);
                getHeatmapData();
                updateSpatialView();
            })
            .on("mouseover", function () {

                createTooltip(element.referenceNode, element.referenceCompartment);
                showTooltip();
            })
            .on("mouseleave", function () {
                hideTooltip();
            });


    });

    function createTooltip(nodeEntry, compartmentEntry) {
        // console.log(nodeEntry);
        // FIXME node entries are different depending on where the function is called
        // FIXME it would be desirable to design uniform access to concentrations
        if (nodeEntry.startsWith("v")) {
            createVesicleTooltipContent(nodeEntry, compartmentEntry);
        } else {
            createCompartmentTooltipContent(nodeEntry, compartmentEntry);
        }
    }

    function createCompartmentTooltipContent(nodeEntry, compartmentEntry) {

        // determine concentration, if available
        let vesicleMembraneConcentration = "none";
        if (concentrationData.get(nodeEntry).get(compartmentEntry) !== undefined) {
            vesicleMembraneConcentration = concentrationData.get(nodeEntry).get(compartmentEntry) + " " + concentrationUnit;
        }
        // set tooltip
        generateTooltip(nodeEntry + "<br/>" +
            compartmentEntry + "<br/>" +
            "value: " + vesicleMembraneConcentration);

    }

    function createVesicleTooltipContent(nodeEntry, compartmentEntry) {
        // determine state, if available
        let vesicleState = "none";
        if (vesicleStates.get(currentTimeStep).get(nodeEntry) !== undefined) {
            vesicleState = vesicleStates.get(currentTimeStep).get(nodeEntry).replace("_", " ").toLowerCase()
        }
        // determine concentration, if available
        let vesicleMembraneConcentration = "none";
        if (concentrationData.get(nodeEntry).get(compartmentEntry) !== undefined) {
            vesicleMembraneConcentration = concentrationData.get(nodeEntry).get(compartmentEntry) + " " + concentrationUnit;
            ;
        }
        // set tooltip
        generateTooltip(nodeEntry + "<br/>" +
            compartmentEntry + "<br/>" +
            "state: " + vesicleState + "<br/>" +
            "value: " + vesicleMembraneConcentration);
    }

}

function setObserved(nodeName, compartmentName) {
    observed = [nodeName, compartmentName];
    // console.log(observed);
}

/**
 * Changes the display of the concentration in the concentration plot.
 * @param selectedTimeIdentifier
 */
function changeVerticalLineData(selectedTimeIdentifier) {

    d3.select(".trajectory.view.graph.verticalLine")
        .attr("x1", x(timeSteps[selectedTimeIdentifier]))
        .attr("x2", x(timeSteps[selectedTimeIdentifier]));

    if (timeSteps[selectedTimeIdentifier] > timeSteps[timeSteps.length / 1.5]) {
        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", -150)

    } else {

        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", 0)
    }

    setCircleOfConcentrationView(0, "one");

    if (activeComponentIdices[1] !== undefined) {
        setCircleOfConcentrationView(1, "two");
    }

    if (activeComponentIdices[2] !== undefined) {
        setCircleOfConcentrationView(2, "three");
    }

    if (activeComponentIdices[3] !== undefined) {
        setCircleOfConcentrationView(3, "four");
    }

    function setCircleOfConcentrationView(number, designator) {
        let id = activeComponentIdices[number];
        let data;

        data = reducedNodeData[getCompartmentFromIndexIdentifier(id) + "_" + getSpeciesFromIndexIdentifier(id)];
        data = data[selectedTimeIdentifier];

        d3.select(".trajectory.view.graph.verticalLine.valueLabel." + designator)
            .datum(data)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[number](d.y) + ")";
            }).text(function (d) {
            return d.y;

        });

        d3.select(".trajectory.view.graph.verticalLine.circle." + designator)
            .datum(data)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[number](d.y) + ")";
            })
    }
}

/**
 * Collects all compartments of a reaction space in an array,
 */
function setNodeCompartments() {

    nestedData.keys().forEach(function (timeStep) {
        if (nestedData.get(timeStep).get(selectedNode) !== undefined) {
            nestedData.get(timeStep).get(selectedNode).keys().forEach(function (compartment) {
                    if (!compartmentsOfSelectedNode.includes(compartment) && !compartment.startsWith("x") && !compartment.startsWith("y")) {
                        compartmentsOfSelectedNode.push(compartment)
                    }

                }
            )
        }
    });
}

function drawConcentrationPlotFromNode() {

    const selector = ".nav.nav-tabs.justify-content-center";

    $(selector).removeClass("invisible");
    $(selector).toggleClass("visible");

    d3.selectAll(".graphHeading").remove();

    compartmentsOfSelectedNode.length = 0;
    activeComponentIdices.length = 0;

    setNodeCompartments();
    clearHtmlTags();

    appendConcentrationPlotTitle();

    reducedNodeData.length = 0;
    sumCurrentNodeData();
    initializeMainContent();

}

function appendConcentrationPlotTitle() {
    d3.select('#trajectory-view-graph')
        .append("i")
        .attr("class", "graphHeading")
        .style("font-size", "xx-large")
        .attr("class", "fas fa-chart-line")
        .on("mouseover", function () {
            generateTooltip("The plot shows the change in concentration over" +
                "<br> the entire period of one or more species. ");
            showTooltip();
        })
        .on("mouseleave", function () {
            hideTooltip();
        });

    d3.select('#trajectory-view-graph')
        .append("h2")
        .attr("class", "graphHeading")
        .style("display", "inline-block")
        .style("margin-left", "4px").text("CONCENTRATION PLOT");
}