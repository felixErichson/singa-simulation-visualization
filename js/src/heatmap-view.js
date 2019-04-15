const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;

let dragedTime;
let slideControl;
let dragedTimeLabel;
let xTimeScale;
let concentrationRange;
let svgSlider;
let moving = false;
let timer;
let comp;
let spec;

function setHeatmapDropdown() {

    d3.select("#trajectory-view-heatmap")
        .append("div")
        .attr("class", "btn-group")
        .attr("id", "heatmap_dropdown")
        .style("trajectoryPlotMargin-top", "5px")
        .style("position", "relative")
        .append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary dropdown-toogle")
        .attr("id", "dropdown_button")
        .attr("data-toggle", "dropdown")
        .attr("aria-haspopup", "true")
        .attr("aria-expanded", "flase")
        .text("select species");

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
                onClickHeatmapDropdown(clickedSpeciesText);
            })
    }
}

function onClickHeatmapDropdown(clickedSpeciesText) {
    $("#dropdown_button").text("species: " + clickedSpeciesText);
    d3.selectAll('#trajectory-view-heatmap svg').remove();
    d3.select("#heatmap-view-slider").html("");
    d3.selectAll('#heatmap-view-slider svg').remove();

    setHeatmapRange();
    setHeatMapSvg();
    appendPlayButton();
    drawSilder(clickedSpeciesText);
    clearHtmlTags();
}

function appendPlayButton() {

    d3.select("#heatmap-view-slider")
        .append("button")
        .attr("id", "play-button")
        .attr("class", "btn btn-primary")
        .text("Play");

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
        .attr("style", "margin-left: 20%")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    getHeatmapData(dragedTime, compartment, species);
    heatmapColor = setHeatmapColor();
    drawHeatmapRectangles(dragedTime);

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
            if (button.text() === "Pause") {
                moving = false;
                clearInterval(timer);
                // timer = 0;
                button.text("Play");
            } else {
                moving = true;
                timer = setInterval("step()", 10);
                //console.log(timer);
                button.text("Pause");
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
        playButton.text("Play");
    }
}

function update(h, compartment, species) {


    slideControl.attr("cx", xTimeScale(h));

    dragedTimeLabel.attr("x", xTimeScale(h))
        .text(d3.format(".3f")(time[h]));

    getHeatmapData(time[h], compartment, species);
    heatmapColor = setHeatmapColor();
    drawHeatmapRectangles(time[h]);
    relativeScaleAxis();
    absoluteScaleAxis();
    drawHeatmapLegend();
    d3.select("#menu-heatmap-data")
        .selectAll("p").remove();
    if (activeComponentIdices[0] !== undefined) {
        changeVerticalLineData(h);
    }
}

function setHeatmapRange() {

    nestedData.keys().forEach(function (timestep) {
        nestedData.get(timestep).keys().forEach(function (node) {
            if (!heatmapXRange.includes(node.split(regEx)[1])) {
                heatmapXRange.push(node.split(regEx)[1]);
            }

            if (!heatmapYRange.includes(node.split(regEx)[2])) {
                heatmapYRange.push(node.split(regEx)[2]);
            }
        })
    });

    heatmapXRange.sort(function sortNumber(a, b) {
        return a - b;
    });

    heatmapYRange.sort(function sortNumber(a, b) {
        return a - b;
    });
}

function drawHeatmapLegend() {

    d3.select("#legend-traffic").remove();
    d3.select(".legendRect").remove();
    d3.select(".axislegend").remove();

   let linearGradient =  heatmapSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-traffic")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%")

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f1ff7f"); //light blue


    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0cac79"); //dark blue

    let legendWidth = Math.min(heatwidth, 400);

    let legendsvg = heatmapSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", 5)
        .attr("y", 400)
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
        .attr("transform", "translate(200,410)")
        .call(xAxis);
}

let LegendAxisScale;

function relativeScaleAxis() {

    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(d3.extent(heatmapData, function (d) {
            return d.value
        }));
}

function absoluteScaleAxis() {
    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(concentrationRange);


}

function getHeatmapData(currentTimeStep, compartment, species) {

    heatmapData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (!node.startsWith("v")) {
            if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                    obj = {
                        //  name: compartment+ "_" + species,
                        x: node.split(regEx)[1],
                        y: node.split(regEx)[2],
                        value: 0
                    };
                    heatmapData.push(obj);
                } else {
                    obj = {
                        x: node.split(regEx)[1],
                        y: node.split(regEx)[2],
                        value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                    };
                    heatmapData.push(obj);
                }

            } else {
                obj = {
                    //  name: compartment+ "_" + species,
                    x: node.split(regEx)[1],
                    y: node.split(regEx)[2],
                    value: 0
                };
                heatmapData.push(obj);

            }
        }
    });
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
    return [minValue, maxValue];
}

function setHeatmapColor() {

    if ($('input[name="check"]:checked').val() === "relative") {

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain(d3.extent(heatmapData, function (d) {
                    //console.log(d.value);
                    return d.value
                })
            )
    } else {

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain(concentrationRange)
    }
}

function setHeatMapSvg() {

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 500)
        .attr("height", 500)
        .append("g")
        .attr("transform",
            "translate(30,10)")
        .attr("class", "PiYG");

}

function drawHeatmapRectangles(currentTimeStep, species) {

    heatmapSvg.selectAll("path").remove();
    heatmapSvg.selectAll("circle").remove();

    let vertices = [];
    let vesicle = [];

    let xScale;
    let yScale;

    vertices.length = 0;
    vesicle.length = 0;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {

        if (node.startsWith("n")) {
            let x = nestedData.get(currentTimeStep).get(node).get("x");
            let y = nestedData.get(currentTimeStep).get(node).get("y");


            let xScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);
            let yScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);

            // console.log(xScale(x), x);
            vertices.push([xScale(x), yScale(y)]);
            heatmapSvg.append("circle")
                .attr("cx", xScale(x))
                .attr("cy", yScale(y))
                .attr("r", 1)
                .style("fill", "black")

        } else {

            let x = nestedData.get(currentTimeStep).get(node).get("x");
            let y = nestedData.get(currentTimeStep).get(node).get("y");

            xScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);
            yScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);

            vesicle.push([x, y]);
        }
    });

    var voronoi = d3.voronoi()
        .extent([[0, 0], [xScale(1000), yScale(1000)]]);

    var paths = heatmapSvg.selectAll("path")
        .data(voronoi(vertices).polygons())
        .enter().append("path")
        .attr("class", function (d, i) {
            return "path" + i
        })
        .attr("d", function (d) {
            return "M" + d.join("L") + "Z";
        });
    // .style("stroke", " black")
    // .style("stroke-width", " 2px")


    for (let i = 0; i < 100; i++) {
        d3.select(".path" + i)
            .datum(heatmapData[i])
            .style("fill", function (d) {
                //console.log(d.value, heatmapColor(d.value));
                return heatmapColor(d.value)
            });
    }

    vesicle.forEach(function (position) {


        heatmapSvg.append("circle")
            .attr("cx", xScale(position[0]))
            .attr("cy", yScale(position[1]))
            .attr("r", 5)
            .style("fill", "none")
            .style("stroke", "black")
            .style("stroke-with", "2px")
    });


    //     .on("mouseover", function (d) {
    //         mouseOverNode(this, d, species, currentValue);
    //     })
    //     .on("mouseleave", function () {
    //         d3.select(this)
    //             .style("stroke-width", "2")
    //             .style("stroke-opacity", 0.6);
    //
    //         d3.select("#menu-heatmap-data")
    //             .selectAll("p").remove();
    //     })
    //     .on("click", function (d) {
    //         drawGraphFromNode(d);
    //         onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species), species));
    //         setChartTitle("Node (" + d.x + "," + d.y + ")");
    //     })
}

function mouseOverNode(currentNode, CurrentNodeObject, species, dragedTime) {

    d3.select(currentNode)
        .style("stroke-width", "5");

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

    if (CurrentNodeObject.value === 0) {
        d3.select("#showed_species").text("species: nothing to find here")
    } else {
        d3.select("#showed_species").text("species: " + species)
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


    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("value: " + CurrentNodeObject.value)
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
            if (!compartmentsOfSelectedNode.includes(compartment)) {
                compartmentsOfSelectedNode.push(compartment)
            }
        })
    });
}

function drawGraphFromNode(data) {
    compartmentsOfSelectedNode.length = 0;
    activeComponentIdices.length = 0;
    selectedNode = "n(" + data.x + "," + data.y + ")";
    setNodeCompartments();
    clearHtmlTags();
    sumCurrentNodeData();
    initializeMainContent();

}