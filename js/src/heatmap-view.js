//TODO CSV einlesen ohne heatmap

const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;


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
 vesicleData = [],
 LegendAxisScale,
 valuesOfConcentration = [],
 membranePositions = [];

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

        drawGraphFromNode();
        appendPlayButton();
        drawSilder(clickedSpeciesText);
        setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText, "csv");
    }

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


    setHeatmapDropdown("#trajectory-view-heatmap", clickedSpeciesText);

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
    concentrationRange = getRangeOfSpecies(species, compartment);
    spec = species;
    comp = compartment;
    dragedTime = time[0];
    svgSlider = d3.select("#heatmap-view-slider")
        .append("svg")
        .attr("style", "margin-left: 50px")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    getHeatmapData(dragedTime, species);
    getVesicleData(dragedTime, compartment, species);
    getMembraneData(dragedTime, species);
    heatmapColor = setHeatmapColor(heatmapData.concat(vesicleData));
    //vesicleColor = setHeatmapColor(vesicleData);
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
        .attr("class", "label333")
        .attr("text-anchor", "middle")
        .text(time[0])
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
        .text(d3.format(".3f")(time[h]));

    getHeatmapData(time[h], species);
    getVesicleData(time[h], compartment, species);
    getMembraneData(time[h], species);
    heatmapColor = setHeatmapColor(heatmapData.concat(vesicleData));
    //vesicleColor = setHeatmapColor(vesicleData);
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
        .domain(d3.extent(heatmapData.concat(vesicleData), function (d) {
            if (d.value > -1) {
                return d.value
            }
        }));
}

function absoluteScaleAxis() {
    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(concentrationRange);
}

function getVesicleData(currentTimeStep, compartment, species) {

    vesicleData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (node.startsWith("v")) {
            if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                    obj = {
                        //  name: compartment+ "_" + species,
                        name: node,
                        value: 0
                    };
                    vesicleData.push(obj);
                } else {
                    obj = {
                        name: node,
                        value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                    };
                    vesicleData.push(obj);
                }

            } else {
                obj = {
                    //  name: compartment+ "_" + species,
                    name: node,
                    value: -1
                };
                vesicleData.push(obj);
            }
        }
    });


}

function getHeatmapData(currentTimeStep, species) {

    heatmapData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (!node.startsWith("v")) {
            nestedData.get(currentTimeStep).get(node).keys().forEach(function (compartment) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get("positions").length < 2) {
                    if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                        if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                            obj = {
                                compartment: compartment,
                                x: node.split(regEx)[1],
                                y: node.split(regEx)[2],
                                value: -1
                            };
                            heatmapData.push(obj);
                        } else {
                            obj = {
                                compartment: compartment,
                                x: node.split(regEx)[1],
                                y: node.split(regEx)[2],
                                value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                            };
                            heatmapData.push(obj);
                        }

                    } else {
                        obj = {
                            compartment: compartment,
                            x: node.split(regEx)[1],
                            y: node.split(regEx)[2],
                            value: -1
                        };
                        heatmapData.push(obj);

                    }
                }

            })

        }
    });
}

function getMembraneData(currentTimeStep, species) {
    membraneData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (!node.startsWith("v")) {
            nestedData.get(currentTimeStep).get(node).keys().forEach(function (compartment) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get("positions").length >= 2) {
                    if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                        if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                            obj = {
                                compartment: compartment,
                                x: node.split(regEx)[1],
                                y: node.split(regEx)[2],
                                value: -1
                            };
                            membraneData.push(obj);
                        } else {
                            obj = {
                                compartment: compartment,
                                x: node.split(regEx)[1],
                                y: node.split(regEx)[2],
                                value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                            };
                            membraneData.push(obj);
                        }

                    } else {
                        obj = {
                            compartment: compartment,
                            x: node.split(regEx)[1],
                            y: node.split(regEx)[2],
                            value: -1
                        };
                        membraneData.push(obj);

                    }
                }

            })

        }
    });
    console.log("+++", membraneData);
}

function getRangeOfSpecies(species, compartment) {
    let maxValue = 0.0;
    let minValue = Number.MAX_VALUE;
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
    });

    if (minValue === Number.MAX_VALUE) {
        return [0, 0]
    }
    return [minValue, maxValue];
}

function setHeatmapColor(data) {
    if ($('input[name="check"]:checked').val() === "relative") {


        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([d3.min(data, function (d) {
                if (d.value > -1) {
                    return d.value
                }
            }), d3.max(data, function (d) {
                if (d.value > -1) {
                    return d.value
                }
            })])

    } else {
        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([concentrationRange[0], concentrationRange[1]])
    }
}

function setHeatMapSvg() {

    let zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[-100, -100], [heatwidth + 90, heatheight + 100]])
        .on("zoom", zoomed);

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 450)
        .attr("height", 450)
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

function drawHeatmapRectangles(currentTimeStep, species) {

    heatmapSvg.selectAll("path").remove();
    heatmapSvg.selectAll("circle").remove();

    let vertices = [];
    let vesiclePositions = [];
    valuesOfConcentration.length = 0;
    let xScale;
    let yScale;

    let hlp = false;
    let yPositionReminder;
    vertices.length = 0;
    vesiclePositions.length = 0;

    xScale = d3.scaleLinear().domain([0, simulationWidth]).range([0, 450]);
    yScale = d3.scaleLinear().domain([0, simulationHeight]).range([0, 450]);

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        nestedData.get(currentTimeStep).get(node).keys().forEach(function (compartment) {
            if (node.startsWith("n")) {

                let positions = nestedData.get(currentTimeStep).get(node).get(compartment).get("positions");

               // console.log(positions);

                if (positions.length === 1) {
                    valuesOfConcentration.push(nestedData.get(currentTimeStep).get(node).get(compartment));
                    positions.forEach(function (position) {
                        vertices.push([xScale(position.x), yScale(position.y)]);
                    })
                }

                if (positions.length >= 2){
                        membranePositions.push(positions);
                }

            } else {

                let positions = nestedData.get(currentTimeStep).get(node).get(compartment).get("positions");
                positions.forEach(function (position) {

                    if (hlp === false) {
                        yPositionReminder = position.y;
                        hlp = true;

                    } else if (hlp === true) {
                        vesiclePositions.push([xScale(position.x), yScale(yPositionReminder), xScale(position.y) - xScale(yPositionReminder)]);
                        hlp = false;
                    }
                })


            }
        })


    });

    vertices.forEach(function (vertex) {
        heatmapSvg.append("circle")
            .attr("cx", vertex[0])
            .attr("cy", vertex[1])
            .attr("r", 2)
            .style("fill", "black")
            .style("z-index", "100");
    });


    // membranePositions.forEach(function (pos) {
    //
    //     pos.forEach(function (d) {
    //         d.x = xScale(d.x);
    //         d.y = yScale(d.y);
    //     })
    //
    // });

    console.log(membranePositions);



    var voronoi = d3.voronoi()
        .extent([[0, 0], [xScale(simulationWidth), yScale(simulationHeight)]]);

    // console.log(vertices);
    var paths = heatmapSvg.selectAll("path")
        .data(voronoi(vertices).polygons())
        .enter().append("path")
        .attr("class", function (d, i) {
            return "path" + i
        })
        .attr("d", function (d) {

            return "M" + d.join("L") + "Z";
        })

        .on("click", function (d) {

            selectedNode = "n(" + d.x + "," + d.y + ")";
            drawGraphFromNode();
           // getIndexIdentifier(getCompartmentFromSpecies(species), species);
                    onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species));
            setChartTitle("Node (" + d.x + "," + d.y + ")");

        })
        .on("mouseover", function (d) {

            d3.select(this)
                .style("stroke", "black")
                .style("stroke-width", "1");
            mouseOverNode(this, d, species, currentTimeStep);
            showTooltip();
            if (d.value === -1) {
                generateTooltip('Node (' + d.x + ',' + d.y + ')' + "<br/>" + d.compartment + "<br/>" + "value: " + "none" );
            } else {
                generateTooltip('Node (' + d.x + ',' + d.y + ')' + "<br/>" + d.compartment + "<br/>" + "value: " + d.value) ;
            }
        })
        .on("mouseleave", function () {
            d3.select(this)
                .style("stroke-width", "0");

            d3.select("#menu-heatmap-data")
                .selectAll("p").remove();
            hideTooltip();
        });

    for (let i in valuesOfConcentration) {
        d3.select(".path" + i)
            .datum(valuesOfConcentration[i].get(species))
            .style("fill", function (d) {
                if (d !== undefined) {

                    return heatmapColor(d)
                } else {
                    return "#fff"
                }

            }).datum(heatmapData[i])
    }

    for (let i in vesiclePositions) {

        heatmapSvg.append("circle")
            .attr("id", "membrane" + i)
            .attr("cx", vesiclePositions[i][0])
            .attr("cy", vesiclePositions[i][1])
            .attr("r", vesiclePositions[i][2] + 2)
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .style("fill", "white");

        heatmapSvg.append("circle")
            .attr("id", "lumen" + i)
            .attr("cx", vesiclePositions[i][0])
            .attr("cy", vesiclePositions[i][1])
            .attr("r", vesiclePositions[i][2])
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .style("fill", "white");

        heatmapSvg.append("circle")
            .attr("id", "v" + i)
            .attr("cx", vesiclePositions[i][0])
            .attr("cy", vesiclePositions[i][1])
            .attr("r", vesiclePositions[i][2] + 3)
            .style("fill", "black")
            .style("fill-opacity", "0.0")
            .on("click", function () {
                selectedNode = "v" + i;
                drawGraphFromNode();
                setChartTitle("Vesicle " + i);
                onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species)[0], species));
            }).on("mouseover", function () {
            d3.select(this).style("stroke-width", "2px").style("stroke", "black");
            showTooltip();
            if (vesicleData[i].value === -1) {
                generateTooltip('Vesicle ' + i + "<br/>" + "value: " + "none");
            } else {
                generateTooltip('Vesicle ' + i + "<br/>" + "value: " + vesicleData[i].value);
            }

        }).on("mouseleave", function () {
            d3.select(this).style("stroke-width", "0").style("stroke", "unset");
            hideTooltip();
        })
    }


    for (let i = 0; i < vesiclePositions.length; i++) {

        let vesicleCompartments = getCompartmentFromSpecies(species);

        vesicleCompartments.forEach(function (compartment) {
            relativeScaleAxis(vesicleData);
            if (compartment === "vesicle membrane") {
                d3.select("#membrane" + i)
                    .datum(vesicleData[i])
                    .style("fill", function (d) {

                        if (d.value !== -1) {
                            return heatmapColor(d.value)
                        } else {
                            return "#fff"
                        }
                    });
            } else if (compartment === "vesicle lumen") {

                d3.select("#lumen" + i)
                    .datum(vesicleData[i])
                    .style("fill", function (d) {
                        if (d.value !== -1) {
                            return heatmapColor(d.value)
                        } else {
                            return "#fff"
                        }
                    });
            }


        })


    }

    membranePositions.forEach(function (positions) {

        heatmapSvg.append("path")
            .data([positions])
            .attr("d", d3.line()
                .curve(d3.curveLinear)
                .x(function (d) {return xScale(d.x);})
                .y(function (d) {return yScale(d.y);})
            )
            .style("stroke", "black")
            .style("stroke-width", "8");

        heatmapSvg.append("path")
            .data([positions])
            .attr("d", d3.line()
                .curve(d3.curveLinear)
                .x(function (d) {return xScale(d.x);})
                .y(function (d) {return yScale(d.y);})
            )
            .style("stroke", "white")
            .style("stroke-width", 6);



    });


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
    initializeMainContent();


}