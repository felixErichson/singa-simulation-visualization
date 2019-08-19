//TODO CSV einlesen ohne heatmap

const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;

let currentcolor;

let xScale;
let yScale;

let infoTooltip = d3.select("body").append("div")
    .attr("class", "infoTooltip")
    .style("opacity", 0);

let dragedTime,
    slideControl,
    dragedTimeLabel,
    xTimeScale,
    concentrationRange,
    svgSlider,
    moving = false,
    timer,
    comp,
    spec,
    legendSvg,
    LegendAxisScale,
    c,
    s,
    currentTimeStep = 0,
    counter = 0;


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

    for (let i in allSpecies) {
        d3.select("#heat_menu")
            .append("a")
            .attr("class", "dropdown-item")
            .attr("id", i)
            .text(allSpecies[i])
            .on("click", function () {
                let clickedSpeciesText = $(this).text();
                onClickHeatmapDropdown(clickedSpeciesText, csv);
            })
    }
}

function initialView(clickedSpeciesText) {

    $('#nav-option').css('visibility', 'visible');
    $('#nav-figure').css('visibility', 'visible');
    $("#dropdown_button").text(clickedSpeciesText);
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
 * @param clickedSpeciesText
 * @param csv String "csv" when loading a CSV file
 */
function onClickHeatmapDropdown(clickedSpeciesText, csv) {

    s = clickedSpeciesText;

    initialView(clickedSpeciesText);

    if (csv === "csv") {
        selectedNode = "n(0,0)";
        drawConcentrationPlotFromNode();
        setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText, "csv");
        onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(s)[0], s), s);
    } else {

        appendSpatialViewHeadLine();
        setHeatMapSvg();
        appendPlayButton();
        drawSilder(clickedSpeciesText);
        clearHtmlTags();
        drawHeatmapLegend();

        d3.select("#trajectory-view-graph")
            .append("div")
            .attr("id", "trajectory-view-hint")
            .append("p")
            .text("To show the changes in concentration in a line chart, click any element in the heatmap.");

        setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText);
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

function drawSilder(species) {

    let compartment = getCompartmentFromSpecies(species);
    dragedTime = 0;

    appendBackwardIcon(compartment, species);
    appendForwardIcon(compartment, species);

    initializeSlider(species);
    let slider =
        svgSlider
            .append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + marginSlider.left + "," + heightSlider / 3 + ")");

    drawTrack(slider, compartment, species);
    drawTrackOverlay(slider);
    setClickFunctionPlayButton();

    function initializeSlider(species) {

        c = getCompartmentFromSpecies(species);

        let compartment = getCompartmentFromSpecies(species);
        concentrationRange = getRangeOfSpecies(species, getCompartmentFromSpecies(species));
        spec = species;
        comp = compartment;
        currentTimeStep = time[0];
        svgSlider = d3.select("#heatmap-view-slider")
            .append("svg")
            .attr("style", "margin-left: 50px")
            .attr("width", widthSlider + marginSlider.left + marginSlider.right)
            .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

        getHeatmapData(species);
        heatmapColor = setHeatmapColor();
        drawSpatialView(species);

        xTimeScale = d3.scaleLinear()
            .domain([0, time.length - 1])
            .range([0, widthSlider])
            .clamp(true);

    }

    function drawTrack(slider, compartment, species) {
        slider.append("line")
            .attr("class", "track")
            .attr("x1", xTimeScale.range()[0])
            .attr("x2", xTimeScale.range()[1])
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
                    dragedTime = Math.trunc(xTimeScale.invert(d3.event.x));
                    updateSpatialView(dragedTime, compartment, species);

                })
            );
    }

    function drawTrackOverlay(slider) {

        slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(0," + 10 + ")")
            .selectAll("text")
            .data(xTimeScale.ticks(8))
            .enter()
            .append("text")
            .attr("x", xTimeScale)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .text(function (d) {
                return d3.format(".0f")(time[d])
            });

        slideControl = slider.insert("circle", ".track-overlay")
            .attr("class", "slideControl")
            .attr("r", 9);

        dragedTimeLabel = slider.append("text")
            .attr("class", "timeLabelSlider")
            .attr("text-anchor", "middle")
            .text(time[0] + " ms")
            .attr("transform", "translate(450," + (-30) + ")");
    }

    function appendBackwardIcon(compartment, species) {
        d3.select("#heatmap-view-slider")
            .append("div")
            .attr("id", "backward")
            .style("margin-left", "273px")
            .style("position", "absolute").on("click", function () {

            if (dragedTime > 0) {
                let x = dragedTime--;
                updateSpatialView(x, compartment, species);
            }
        })
            .append("i")
            .attr("class", "fas fa-step-backward fa-lg")
            .style("color", "#0cac79");
    }

    function appendForwardIcon(compartment, species) {
        d3.select("#heatmap-view-slider")
            .append("div")
            .attr("id", "forward")
            .style("margin-left", "394px")
            .style("position", "absolute")
            .on("click", function () {


                if (dragedTime < time.length) {

                    let x = dragedTime++;
                    updateSpatialView(x, compartment, species);

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
                        step();
                    }, 100);
                    button.select("i").attr("class", "far fa-pause-circle fa-2x");
                    //button.text("Pause");
                }
            });
    }

}

function step() {
    updateSpatialView(dragedTime, comp, spec);
    dragedTime = dragedTime + (5);
    if (dragedTime > time.length - 1) {
        moving = false;
        dragedTime = 0;
        clearInterval(timer);
        playButton.select("i").attr("class", "far fa-play-circle fa-2x");
    }
}

/**
 * Renews the data, legend and color scaling of the heatmap and refreshes it.
 * @param timeIndex
 * @param compartment
 * @param species
 * @param figure
 */
function updateSpatialView(timeIndex, compartment, species, figure) {

    currentTimeStep = time[timeIndex];

    slideControl.attr("cx", xTimeScale(timeIndex));
    dragedTimeLabel
        .text(d3.format(".3f")(currentTimeStep) + " ms");

    getHeatmapData(species);
    heatmapColor = setHeatmapColor();
    drawSpatialView(species, figure);
    relativeScaleAxis();
    absoluteScaleAxis();
    drawHeatmapLegend();

    d3.select("#menu-heatmap-data")
        .selectAll("p").remove();
    if (activeComponentIdices[0] !== undefined) {
        changeVerticalLineData(timeIndex);
    }
}

function drawHeatmapLegend() {

    d3.select("#heatLEngend").html('');

    d3.select("#legend-traffic").remove();
    d3.select(".legendWrapper").remove();
    d3.select(".legendRect").remove();
    d3.select(".axislegend").remove();

    let linearGradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-traffic")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f1ff7f");

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0cac79");

    let legendWidth = Math.max(heatwidth, 460);

    let legendsvg = legendSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", 15)
        .attr("y", 0)
        //.attr("rx", hexRadius*1.25/2)
        .attr("width", heatwidth)
        .attr("height", 10)
        .style("fill", "url(#legend-traffic)");

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
 * @param species
 */
function getHeatmapData(species) {

    heatmapData = d3.map();
    let yPositionReminder;
    let hlp = false;
    xScale = d3.scaleLinear().domain([0, simulationWidth]).range([0, 450]);
    yScale = d3.scaleLinear().domain([0, simulationHeight]).range([0, 450]);

    nestedData.get(currentTimeStep).entries().forEach(function (updatable) {
        let currentUpdatableMap = d3.map();
        heatmapData.set(updatable.key, currentUpdatableMap);
        updatable.value.entries().forEach(function (compartment) {
            let compartmentMap = d3.map();
            currentUpdatableMap.set(compartment.key, compartmentMap);
            compartment.value.entries().forEach(function (value) {
                if (value.key === species) {
                    compartmentMap.set("concentration", value.value);
                }
                if (value.key === "positions") {
                    if (updatable.key.startsWith("n")) {
                        if (compartment.key.includes("membrane")) {

                            compartmentMap.set("path", positionsToPath(value.value));
                        } else {
                            compartmentMap.set("path", positionsToPath(value.value) + "Z");
                        }
                    } else if (updatable.key.startsWith("v")) {
                        if (hlp === false) {
                            yPositionReminder = value.value[0].y;
                            hlp = true;

                        } else if (hlp === true) {
                            currentUpdatableMap.set("position",
                                [xScale(value.value[0].x), yScale(yPositionReminder), xScale(value.value[0].y) - xScale(yPositionReminder)]);
                            hlp = false;
                        }
                    }
                }
            })
        })
    });
}

/**
 * Returns minimum and maximum concentrations of a species over the entire simulation period.
 * @param species
 * @param compartments
 * @return Array [minimum , maximum] concentration
 */
function getRangeOfSpecies(species, compartments) {
    let maxValue = 0.0;
    let minValue = Number.MAX_VALUE;

    compartments.forEach(function (compartment) {
        nestedData.values().forEach(function (node) {
            node.values().forEach(function (currentSpecies) {
                if (currentSpecies.get(compartment) !== undefined) {
                    if (maxValue < currentSpecies.get(compartment).get(species))
                        maxValue = currentSpecies.get(compartment).get(species);
                    if (minValue > currentSpecies.get(compartment).get(species)) {
                        minValue = currentSpecies.get(compartment).get(species);
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

/**
 * Returns all concentrations of a species for one time step
 * @return Array of concentrations
 */
function getCurrentConcentrations() {

    let concentrations = [];
    heatmapData.entries().forEach(function (nodeEntry) {
        if (nodeEntry.key.startsWith("n")) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (compartmentEntry.value.get("concentration") !== undefined) {
                    concentrations.push(compartmentEntry.value.get("concentration"))
                }
            })
        } else if (nodeEntry.key.startsWith("v")) {
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
    if ($('input[name="check"]:checked').val() === "relative") {

        let concentrations = getCurrentConcentrations();

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([d3.min(concentrations, function (d) {
                return d

            }), d3.max(concentrations, function (d) {
                return d

            })])

    } else {
        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([concentrationRange[0], concentrationRange[1]])
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
        path += xScale(position.x) + "," + yScale(position.y);
        if (i !== positions.length - 1) {
            path += ","
        }
    });
    return path;
}

/**
 * Draws the spatial view into the SVG area. It distinguishes between nodes, membranes and vesicles.
 * @param selectedSpecies
 * @param figure
 */
function drawSpatialView(selectedSpecies, figure) {

    let rectOpacity;
    let membranePaths = [];

    let species = selectedSpecies;

    if (figure === true) {
        heatmapSvg.selectAll("path").remove();
        rectOpacity = 0.0;
    } else {
        heatmapSvg.selectAll("path").remove();
        heatmapSvg.selectAll("circle").remove();
        rectOpacity = 1.0;
    }

    heatmapData.entries().forEach(function (nodeEntry) {
        if (nodeEntry.key.startsWith("n")) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (!compartmentEntry.key.includes("membrane")) {
                    drawNodes(compartmentEntry, nodeEntry);
                } else {
                    membranePaths.push(nodeEntry);
                }
            })
        } else if (nodeEntry.key.startsWith("v")) {
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
                d3.select("#trajectory-view-hint").remove();
                selectedNode = nodeEntry.key;
                drawConcentrationPlotFromNode();
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species), species);
                setChartTitle(selectedNode);

            })
            .on("mouseover", function () {

                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", "1");
                mouseOverNode(this, nodeEntry, species, currentTimeStep);
                showTooltip();
                createTooltip("compartment", nodeEntry, compartmentEntry);
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .style("stroke-width", "0");

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
                d3.select("#trajectory-view-hint").remove();
                selectedNode = nodeEntry.key;
                drawConcentrationPlotFromNode();
                setChartTitle(nodeEntry.key);
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species), species);
            }).on("mouseover", function () {
            d3.select(this).style("stroke-width", "2px").style("stroke", "black");
            showTooltip();
            showTooltip();
            createTooltip("vesicle", nodeEntry, null);
        }).on("mouseleave", function () {
            d3.select(this).style("stroke-width", "0").style("stroke", "unset");
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
                            d3.select("#trajectory-view-hint").remove();
                            selectedNode = nodeEntry.key;
                            drawConcentrationPlotFromNode();
                            onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species), species);
                            setChartTitle(selectedNode);

                        })
                        .on("mouseover", function () {
                            d3.select("#membrane" + i)
                                .style("stroke-width", "6px");
                            mouseOverNode(this, nodeEntry, species, currentTimeStep);
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

function mouseOverNode(currentNode, CurrentNodeObject, species, dragedTime) {

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
        .attr("x1", x(time[selectedTimeIdentifier]))
        .attr("x2", x(time[selectedTimeIdentifier]));

    if (time[selectedTimeIdentifier] > time[time.length / 1.5]) {
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