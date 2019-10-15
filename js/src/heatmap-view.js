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
    interpolator = d3.interpolateViridis;


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

    d3.select("#menu-heatmap-data")
        .selectAll("p").remove();
    if (activeComponentIdices[0] !== undefined) {
        changeVerticalLineData(currentTimeIndex);
    }
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

    if ($('input[name="check"]:checked').val() === "relative") {
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

/**
 * Creates a new data format for a time step. The data contains all nodes and compartments.
 * Compartments contains concentrations of selected species and the svg path data.
 *  Example:
 *  n(0,0):
 *  -- cytoplasms:
 *  ----- concatration: 1000
 *  ----- path: "M0,42,0,5Z"
 */


function getHeatmapData() {

    heatmapData = d3.map();
    let simulationExtend = simulationWidth < simulationHeight ? simulationHeight : simulationWidth;
    simulationScale = d3.scaleLinear().domain([0, simulationExtend]).range([0, 450]);

    nestedData.get(currentTimeStep).entries().forEach(function (updatable) {
            let currentUpdatableMap = d3.map();
            heatmapData.set(updatable.key, currentUpdatableMap);
            // iterate updatables
            updatable.value.entries().forEach(function (compartment) {
                    let compartmentMap = d3.map();
                    currentUpdatableMap.set(compartment.key, compartmentMap);
                    // iterate compartments
                    compartment.value.entries().forEach(function (value) {
                        if (value.key === globalSpecies) {
                            compartmentMap.set("concentration", value.value);
                        }
                        if (isNode(updatable)) {
                            if (value.key === "positions") {
                                if (compartment.key.includes("membrane")) {
                                    compartmentMap.set("path", positionsToPath(value.value));
                                } else {
                                    compartmentMap.set("path", positionsToPath(value.value) + "Z");
                                }
                            }
                        }
                    });
                    // set vesicle positions
                    if (isVesicle(updatable)) {
                        let centerX = updatable.value.get("vesicle lumen").get("positions")[0].x;
                        let centerY = updatable.value.get("vesicle lumen").get("positions")[0].y;
                        let borderY = updatable.value.get("vesicle membrane").get("positions")[0].y;
                        currentUpdatableMap.set("position", [simulationScale(centerX), simulationScale(centerY), simulationScale(borderY - centerY)])
                    }
                }
            )
        }
    );
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
    heatmapData.entries().forEach(function (nodeEntry) {
        console.log(nodeEntry);
        if (isNode(nodeEntry)) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (compartmentEntry.value.get("concentration") !== undefined) {
                    concentrations.push(compartmentEntry.value.get("concentration"))
                }
            })
        } else if (isVesicle(nodeEntry)) {
            nodeEntry.value.entries().forEach(function (updatable) {
                if (updatable.key !== "position" && updatable.value !== undefined) {
                    concentrations.push(updatable.value.get("concentration"))
                }

            })
        }
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

    let rectOpacity;
    let membranePaths = [];

    if (figure === true) {
        heatmapSvg.selectAll("path").remove();
        rectOpacity = 0.0;
    } else {
        heatmapSvg.selectAll("path").remove();
        heatmapSvg.selectAll("circle").remove();
        rectOpacity = 1.0;
    }

    heatmapData.entries().forEach(function (nodeEntry) {
        if (isNode(nodeEntry)) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (!compartmentEntry.key.includes("membrane")) {
                    drawNodes(compartmentEntry, nodeEntry);
                } else {
                    membranePaths.push(nodeEntry);
                }
            })
        } else if (isVesicle(nodeEntry)) {
            drawVesicle(nodeEntry, figure);
        }
    });

    drawMembrane();


    function drawNodes(compartmentEntry, nodeEntry) {

        heatmapSvg.append("path")
            .attr("d", compartmentEntry.value.get("path"))
            .style("fill", function () {
                if (compartmentEntry.value.get("concentration") !== undefined) {
                    return heatmapColor(compartmentEntry.value.get("concentration"))
                } else {
                    return "#fff"
                }
            })
            .style("opacity", function () {
                return rectOpacity;
            })
            .on("click", function () {
                d3.selectAll(".observed")
                    .style("stroke", "black")
                    .style("stroke-width", "0px")
                    .classed("observed", false);

                d3.select(this)
                    .classed("observed", true)
                    .style("stroke-width", "2px")
                    .style("stroke", "red");

                d3.select("#trajectory-view-hint").remove();
                selectedNode = nodeEntry.key;
                drawConcentrationPlotFromNode();
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(globalSpecies)[0], globalSpecies), globalSpecies);
                setChartTitle(selectedNode);

            })
            .on("mouseover", function () {

                d3.selectAll(".vesiclePaths").remove();
                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", "1");
                mouseOverNode(this, nodeEntry, currentTimeStep);
                showTooltip();
                createTooltip("compartment", nodeEntry, compartmentEntry);
            })
            .on("mouseleave", function () {
                if (this.className.animVal !== "observed") {
                    d3.select(this)
                        .style("stroke-width", "0");
                }


                d3.select("#menu-heatmap-data")
                    .selectAll("p").remove();
                hideTooltip();
            });
    }

    function drawVesicle(nodeEntry, figure) {

        let position = nodeEntry.value.get("position");
        //first circle = vesicle membrane
        heatmapSvg.append("circle")
            .attr("cx", position[0])
            .attr("cy", position[1])
            .attr("r", position[2] + position[2])
            .style("stroke", "black")
            .style("stroke-width", "0.01em")
            .style("fill", function () {
                if (figure === true) {
                    return currentcolor;
                } else {
                    if (nodeEntry.value.get("vesicle membrane").get("concentration") !== undefined) {
                        return heatmapColor(nodeEntry.value.get("vesicle membrane").get("concentration"))
                    } else {
                        return "#fff"
                    }
                }

            });
        //second circle = vesicle lumen
        heatmapSvg.append("circle")
            .attr("cx", position[0])
            .attr("cy", position[1])
            .attr("r", position[2])
            .style("stroke", "black")
            .style("stroke-width", "0.01em")
            .style("fill", "white");

        //third circle = overlay to catch the whole vesicle with mouse functions.
        heatmapSvg.append("circle")
            .attr("cx", position[0])
            .attr("cy", position[1])
            .attr("r", position[2] + position[2])
            .style("fill", "black")
            .style("fill-opacity", "0.0")
            .on("click", function () {

                // Vesicle Path-------------------------------
                heatmapSvg.append("path")
                    .attr("class", "vesiclePathsClicked")
                    .attr("d", vesiclePaths.get(nodeEntry.key))
                    .style("stroke-width", "1px")
                    .style("stroke", "black");

                d3.selectAll(".observed")
                    .style("stroke", "black")
                    .style("stroke-width", "0px")
                    .classed("observed", false);

                d3.select(this)
                    .classed("observed", true)
                    .style("stroke", "red");

                d3.select("#trajectory-view-hint").remove();
                selectedNode = nodeEntry.key;
                drawConcentrationPlotFromNode();
                setChartTitle(nodeEntry.key);
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies()[0],),);
            }).on("mouseover", function () {
            d3.selectAll(".vesiclePaths").remove();
            if (this.className.animVal === "observed") {
                d3.select(this).style("stroke-width", "2px").style("stroke", "red");
            } else {
                d3.select(this).style("stroke-width", "2px").style("stroke", "black");
            }
            showTooltip();
            showTooltip();
            createTooltip("vesicle", nodeEntry, null);

            heatmapSvg.append("path")
                .attr("class", "vesiclePaths")
                .attr("d", vesiclePaths.get(nodeEntry.key))
                .style("stroke-width", "1px")
                .style("stroke", "black");

            // console.log(nodeEntry.key);


        }).on("mouseleave", function () {

            if (this.className.animVal !== "observed") {
                d3.select(this).style("stroke-width", "0px").style("stroke", "unset");
            }

            hideTooltip();
        })

    }

    function createTooltip(context, nodeEntry, compartmentEntry) {
        // FIXME node entries are different depending on where the function is called
        // FIXME it would be desirable to design uniform access to concentrations
        switch (context) {
            case "vesicle": {
                createVesicleTooltipContent(nodeEntry);
                break;
            }
            case "compartment": {
                createCompartmentTooltipContent(nodeEntry, compartmentEntry);
                break;
            }
            default:
                break;
        }
    }

    function createCompartmentTooltipContent(nodeEntry, compartmentEntry) {
        // determine concentration, if available
        let vesicleMembraneConcentration = "none";
        if (compartmentEntry.value.get("concentration") !== undefined) {
            vesicleMembraneConcentration = compartmentEntry.value.get("concentration") + " " + concentrationUnit;
        }
        // set tooltip
        generateTooltip(nodeEntry.key + "<br/>" +
            compartmentEntry.key + "<br/>" +
            "value: " + vesicleMembraneConcentration);

    }

    function createVesicleTooltipContent(nodeEntry) {
        // determine state, if available
        let vesicleState = "none";
        if (vesicleStates.get(currentTimeStep).get(nodeEntry.key) !== undefined) {
            vesicleState = vesicleStates.get(currentTimeStep).get(nodeEntry.key).replace("_", " ").toLowerCase()
        }
        // determine concentration, if available
        let vesicleMembraneConcentration = "none";
        if (nodeEntry.value.get("vesicle membrane").get("concentration") !== undefined) {
            vesicleMembraneConcentration = nodeEntry.value.get("vesicle membrane").get("concentration") + " " + concentrationUnit;
        }
        // set tooltip
        generateTooltip(nodeEntry.key + "<br/>" +
            "state: " + vesicleState + "<br/>" +
            "value: " + vesicleMembraneConcentration);
    }

    function drawMembrane() {

        membranePaths.forEach(function (nodeEntry, i) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (compartmentEntry.key.includes("membrane")) {

                    //first path = edge of membrane
                    heatmapSvg.append("path")
                        .attr("id", "membrane" + i)
                        .attr("d", compartmentEntry.value.get("path"))
                        .style("stroke", "black")
                        .style("stroke-width", "4px");

                    //second path = membrane
                    heatmapSvg.append("path")
                        .attr("d", compartmentEntry.value.get("path"))
                        .style("stroke", function () {
                            if (compartmentEntry.value.get("concentration") !== undefined) {

                                return heatmapColor(compartmentEntry.value.get("concentration"))
                            } else {
                                return "#fff"
                            }
                        })
                        .style("stroke-width", "3px")
                        .on("click", function () {
                            d3.selectAll(".observed")
                                .style("stroke", "black")
                                .classed("observed", false);

                            d3.select("#membrane" + i)
                                .classed("observed", true)
                                .style("stroke", "red");

                            d3.select("#trajectory-view-hint").remove();
                            selectedNode = nodeEntry.key;
                            drawConcentrationPlotFromNode();
                            onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies()[0],),);
                            setChartTitle(selectedNode);

                        })
                        .on("mouseover", function () {
                            d3.selectAll(".vesiclePaths").remove();
                            d3.select("#membrane" + i)
                                .style("stroke-width", "6px");
                            mouseOverNode(this, nodeEntry, currentTimeStep);
                            showTooltip();
                            createTooltip("compartment", nodeEntry, compartmentEntry);
                        })
                        .on("mouseleave", function () {
                            d3.select("#membrane" + i)
                                .style("stroke-width", "4px");
                            d3.select("#menu-heatmap-data")
                                .selectAll("p").remove();
                            hideTooltip();
                        });

                }
            });

        })
    }

}

function mouseOverNode(currentNode, CurrentNodeObject, dragedTime) {

    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("Node (" + CurrentNodeObject.x + "," + CurrentNodeObject.y + ")");

    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0");

    if (CurrentNodeObject.value === -1) {

        d3.select("#menu-heatmap-data")
            .append("p")
            .attr("position", "absolute")
            .attr("bottom", "0")
            .text("value: " + "none");

    } else {

        d3.select("#menu-heatmap-data")
            .append("p")
            .attr("position", "absolute")
            .attr("bottom", "0")
            .text("value: " + CurrentNodeObject.value);

    }

    let possibleCompartments = nestedData.get(dragedTime).get("n(" + CurrentNodeObject.x + "," + CurrentNodeObject.y + ")");

    if (possibleCompartments !== undefined) {
        possibleCompartments = possibleCompartments.keys();
    }

    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("possible nodeCompartments: " + possibleCompartments);
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