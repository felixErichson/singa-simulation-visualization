//TODO CSV einlesen ohne heatmap

const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;


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
    LegendAxisScale;


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

function onClickHeatmapDropdown(clickedSpeciesText, csv) {


    $('#nav-option').css('visibility', 'visible');
    $("#dropdown_button").text(clickedSpeciesText);
    d3.selectAll('#trajectory-view-heatmap svg').remove();
    d3.selectAll('.heatmapHeading').remove();
    d3.select("#play-button").remove();
    d3.selectAll('#heatmap-view-slider svg').remove();


    if (csv === "csv") {
        selectedNode = "n(0,0)";
        drawGraphFromNode();
        // appendPlayButton();
        // drawSilder(clickedSpeciesText);
        setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText, "csv");
    } else {


        d3.select('#trajectory-view-heatmap')
            .append("i")
            .style("font-size", "xx-large")
            .attr("class", "heatmapHeading fas fa-th")
            .on("mouseover", function () {
                generateTooltip('The heatmap represents a part of a cell. <br>' +
                    ' The color gradient shows the change in concentration of individual species. <br> ' +
                    '<b>Clicking</b> on the contents allows to see the concentration changes in a line plot.<br>')
                showTooltip();
            })
            .on("mouseleave", function () {
                hideTooltip();
            });

        d3.select('#trajectory-view-heatmap')
            .append("h2")
            .attr("class", "heatmapHeading")
            .style("display", "inline-block")
            .style("margin-left", "4px").text("HEATMAP");

        setHeatMapSvg();
        appendPlayButton();
        drawSilder(clickedSpeciesText);
        clearHtmlTags();
        drawHeatmapLegend();

        d3.select("#trajectory-view-graph")
            .append("div")
            .attr("id", "trajectory-view-hint")
            .append("p")
            .text("To show concentration changes as line chart you should click on an element in the Heatmap");


        setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText);
    }
}

function appendPlayButton() {

    d3.select("#heatmap-view-slider")
        .append("button")
        .attr("id", "play-button")
        .attr("class", "btn btn-primary")
        .append("i")
        .attr("class", "fas fa-play");


    playButton = d3.select("#play-button")
}

function initializeSlider(species) {

    let compartment = getCompartmentFromSpecies(species);
    concentrationRange = getRangeOfSpecies(species, getCompartmentFromSpecies(species));
    spec = species;
    comp = compartment;
    dragedTime = time[0];
    svgSlider = d3.select("#heatmap-view-slider")
        .append("svg")
        .attr("style", "margin-left: 50px")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    getHeatmapData(dragedTime, species);
    heatmapColor = setHeatmapColor();
    drawHeatmapRectangles(dragedTime, species);

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
                update(dragedTime, compartment, species);

            })
        );
}

function drawTrackOverlay(slider) {
    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 10 + ")")
        .selectAll("text")
        .data(xTimeScale.ticks(10))
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
        .attr("transform", "translate(0," + (-25) + ")");
}

function drawSilder(species) {

    let compartment = getCompartmentFromSpecies(species);

    initializeSlider(species);
    dragedTime = 0;
    let slider =
        svgSlider
            .append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + marginSlider.left + "," + heightSlider / 3 + ")");


    drawTrack(slider, compartment, species);
    drawTrackOverlay(slider);

    playButton
        .on("click", function () {
            let button = d3.select(this);
            if (button.select("i").attr("class") === "fas fa-pause") {
                moving = false;
                clearInterval(timer);
                // timer = 0;
                button.select("i").attr("class", "fas fa-play");
            } else {
                moving = true;
                timer = setInterval("step()", 100);
                //console.log(timer);
                button.select("i").attr("class", "fas fa-pause");
                //button.text("Pause");
            }
        });
}

function step() {
    update(dragedTime, comp, spec);
    dragedTime = dragedTime + (5);
    // console.log(dragedTime);
    if (dragedTime > time.length - 1) {
        moving = false;
        dragedTime = 0;
        clearInterval(timer);
        playButton.select("i").attr("class", "fas fa-play");
    }
}

function update(h, compartment, species) {
    slideControl.attr("cx", xTimeScale(h));
    dragedTimeLabel.attr("x", xTimeScale(h))
        .text(d3.format(".3f")(time[h])+ " ms");

    getHeatmapData(time[h], species);
    heatmapColor = setHeatmapColor();
    drawHeatmapRectangles(time[h], species);
    relativeScaleAxis();
    absoluteScaleAxis();
    drawHeatmapLegend();

    d3.select("#menu-heatmap-data")
        .selectAll("p").remove();
    if (activeComponentIdices[0] !== undefined) {
        changeVerticalLineData(h);
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

    let legendWidth = Math.min(heatwidth, 450);

    let legendsvg = legendSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", 15)
        .attr("y", 0)
        //.attr("rx", hexRadius*1.25/2)
        .attr("width", legendWidth)
        .attr("height", 10)
        .style("fill", "url(#legend-traffic)");


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

function getHeatmapData(currentTimeStep, species) {

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
                    //  console.log(value.value);
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
                            currentUpdatableMap.set("position", [xScale(value.value[0].x), yScale(yPositionReminder), xScale(value.value[0].y) - xScale(yPositionReminder)]);
                            hlp = false;
                        }


                    }
                }
            })
        })
    });
    //console.log(heatmapData);
}


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
        .on("zoom", zoomed);

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", 450)
        .attr("height", 450)
        .attr("id","heatmapSvg")

        .style("border", "1px solid black")
        .append("g")
        .attr("transform",
            "translate(0,0)")
        .attr("class", "PiYG")
        .call(zoom);

    legendSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 450)
        .attr("height", 50)
        .attr("class", "heatLegend");


}

function zoomed() {
    heatmapSvg.attr("transform", d3.event.transform);
}

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

function drawHeatmapRectangles(currentTimeStep, species) {

    heatmapSvg.selectAll("path").remove();
    heatmapSvg.selectAll("circle").remove();

    let membranePaths = [];

    heatmapData.entries().forEach(function (nodeEntry) {
        if (nodeEntry.key.startsWith("n")) {
            nodeEntry.value.entries().forEach(function (compartmentEntry) {
                if (!compartmentEntry.key.includes("membrane")) {
                    heatmapSvg.append("path")

                        .attr("d", compartmentEntry.value.get("path"))
                        .style("fill", function () {
                            if (compartmentEntry.value.get("concentration") !== undefined) {

                                return heatmapColor(compartmentEntry.value.get("concentration"))
                            } else {
                                return "#fff"
                            }

                        })
                        .on("click", function () {
                            d3.select("#trajectory-view-hint").remove();
                            selectedNode = nodeEntry.key;
                            drawGraphFromNode();
                            onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species));
                            setChartTitle(selectedNode);

                        })
                        .on("mouseover", function () {

                            d3.select(this)
                                .style("stroke", "black")
                                .style("stroke-width", "1");
                            mouseOverNode(this, nodeEntry, species, currentTimeStep);
                            showTooltip();
                            if (compartmentEntry.value.get("concentration") === undefined) {
                                generateTooltip(nodeEntry.key + "<br/>" + compartmentEntry.key + "<br/>" + "value: " + "none");
                            } else {
                                generateTooltip(nodeEntry.key + "<br/>" + compartmentEntry.key + "<br/>" + "value: " + compartmentEntry.value.get("concentration"));
                            }
                        })
                        .on("mouseleave", function () {
                            d3.select(this)
                                .style("stroke-width", "0");

                            d3.select("#menu-heatmap-data")
                                .selectAll("p").remove();
                            hideTooltip();
                        });
                } else {
                    membranePaths.push(nodeEntry);
                }
            })
        } else if (nodeEntry.key.startsWith("v")) {

            let position = nodeEntry.value.get("position");
            heatmapSvg.append("circle")
                .attr("cx", position[0])
                .attr("cy", position[1])
                .attr("r", position[2] + position[2])
                .style("stroke", "black")
                .style("stroke-width", "0.01em")
                .style("fill", function () {
                    if (nodeEntry.value.get("vesicle membrane").get("concentration") !== undefined) {

                        return heatmapColor(nodeEntry.value.get("vesicle membrane").get("concentration"))
                    } else {
                        return "#fff"
                    }
                });

            heatmapSvg.append("circle")
                .attr("cx", position[0])
                .attr("cy", position[1])
                .attr("r", position[2])
                .style("stroke", "black")
                .style("stroke-width", "0.01em")
                .style("fill", "white");

            heatmapSvg.append("circle")
                .attr("cx", position[0])
                .attr("cy", position[1])
                .attr("r", position[2] + position[2])
                .style("fill", "black")
                .style("fill-opacity", "0.0")
                .on("click", function () {
                    d3.select("#trajectory-view-hint").remove();
                    selectedNode = nodeEntry.key;
                    drawGraphFromNode();
                    setChartTitle(nodeEntry.key);
                    onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species));
                }).on("mouseover", function () {
                d3.select(this).style("stroke-width", "2px").style("stroke", "black");
                showTooltip();
                showTooltip();
                if (nodeEntry.value.get("vesicle membrane").value === undefined) {
                    generateTooltip(nodeEntry.key + "<br/>" + "<br/>" + "value: " + "none");
                } else {
                    generateTooltip(nodeEntry.key + "<br/>" + "<br/>" + "value: " + nodeEntry.value.get("vesicle membrane").value);
                }

            }).on("mouseleave", function () {
                d3.select(this).style("stroke-width", "0").style("stroke", "unset");
                hideTooltip();
            })
        }
    });

    membranePaths.forEach(function (nodeEntry, i) {
        nodeEntry.value.entries().forEach(function (compartmentEntry) {
            if (compartmentEntry.key.includes("membrane")) {


                heatmapSvg.append("path")
                    .attr("id", "membrane" + i)
                    .attr("d", compartmentEntry.value.get("path"))
                    .style("stroke", "black")
                    .style("stroke-width", "4px");


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
                        drawGraphFromNode();
                        onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species));
                        setChartTitle(selectedNode);

                    })
                    .on("mouseover", function () {
                        d3.select("#membrane" + i)
                            .style("stroke-width", "6px");
                        mouseOverNode(this, nodeEntry, species, currentTimeStep);
                        showTooltip();
                        if (compartmentEntry.value.get("concentration") === undefined) {
                            generateTooltip(nodeEntry.key + "<br/>" + compartmentEntry.key + "<br/>" + "value: " + "none");
                        } else {
                            generateTooltip(nodeEntry.key + "<br/>" + compartmentEntry.key + "<br/>" + "value: " + compartmentEntry.value.get("concentration"));
                        }
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

function changeVerticalLineData(selectedTime) {

    d3.select(".trajectory.view.graph.verticalLine")
        .attr("x1", x(time[selectedTime]))
        .attr("x2", x(time[selectedTime]));

    let id1 = activeComponentIdices[0];
    let data = reducedNodeData[getCompartmentFromIndexIdentifier(id1) + "_" + getSpeciesFromIndexIdentifier(id1)];
    data = data[selectedTime];

    if (time[selectedTime] > time[time.length / 1.5]) {
        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", -150)

    } else {

        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", 0)
    }

    d3.select(".trajectory.view.graph.verticalLine.valueLabel.one")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + scales[0](d.y) + ")";
        }).text(function (d) {
        return d.y;
    });

    d3.select(".trajectory.view.graph.verticalLine.circle")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + scales[0](d.y) + ")";
        });


    if (activeComponentIdices[1] !== undefined) {

        let id2 = activeComponentIdices[1];
        let data2;

        data2 = reducedNodeData[getCompartmentFromIndexIdentifier(id2) + "_" + getSpeciesFromIndexIdentifier(id2)];
        data2 = data2[selectedTime];

        d3.select(".trajectory.view.graph.verticalLine.valueLabel.two")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[1](d.y) + ")";
            }).text(function (d) {
            return d.y;

        });

        d3.select(".trajectory.view.graph.verticalLine.circle2")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[1](d.y) + ")";
            })
    }
}

function setNodeCompartments() {

    nestedData.keys().forEach(function (timeStep) {
        nestedData.get(timeStep).get(selectedNode).keys().forEach(function (compartment) {
            if (!compartmentsOfSelectedNode.includes(compartment) && !compartment.startsWith("x") && !compartment.startsWith("y")) {
                compartmentsOfSelectedNode.push(compartment)
            }
        })
    });
}

function drawGraphFromNode() {

    const selector = ".nav.nav-tabs.justify-content-center";

    $(selector).removeClass("invisible");
    $(selector).toggleClass("visible");

    d3.selectAll(".graphHeading").remove();


    compartmentsOfSelectedNode.length = 0;
    activeComponentIdices.length = 0;

    setNodeCompartments();
    clearHtmlTags();


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
        .style("margin-left", "4px").text("PLOT");


    reducedNodeData.length = 0;
    sumCurrentNodeData();
    //console.log("hallo 2");
    initializeMainContent();


}

function showSvgCode() {
    //get svg element.
    let temp = document.getElementById("trajectory-view-heatmap");
    var svgExport = temp.getElementsByTagName("svg")[0];


    //get svg source.
    let svgxml = (new XMLSerializer).serializeToString(svgExport);
    console.log(svgxml);


    $("#svg_code").text(svgxml);

//add name spaces.
    if(!svgxml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        svgxml = svgxml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!svgxml.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        svgxml = svgxml.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

//add xml declaration
    svgxml = '<?xml version="1.0" standalone="no"?>\r\n' + svgxml;

//convert svg source to URI data scheme.
    var svgUrl = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svgxml);

    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "heatmap.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);


}